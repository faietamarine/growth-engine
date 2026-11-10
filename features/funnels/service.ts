import "server-only";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns, funnels, landingPages, type User, type WorkStatus } from "@/db/schema";
import { audit } from "@/lib/audit";
import { canTransition, funnelEditable } from "@/lib/campaigns/status";
import { getTemplate } from "@/lib/funnels/templates";
import type { FunnelInput } from "@/lib/funnels/validation";
import { WORK_STATUS_UI } from "@/lib/labels";

export async function listFunnels(f: { stato?: WorkStatus; q?: string; campaignId?: string } = {}) {
  const cond = [eq(funnels.isTemplate, false)];
  if (f.stato) cond.push(eq(funnels.status, f.stato));
  if (f.campaignId) cond.push(eq(funnels.campaignId, f.campaignId));
  if (f.q) cond.push(or(like(funnels.name, `%${f.q}%`), like(funnels.promise, `%${f.q}%`))!);
  const rows = await db
    .select({ f: funnels, campaignName: campaigns.name })
    .from(funnels)
    .leftJoin(campaigns, eq(funnels.campaignId, campaigns.id))
    .where(and(...cond))
    .orderBy(desc(funnels.updatedAt));
  return rows.map((r) => ({ ...r.f, campaignName: r.campaignName }));
}

export async function getFunnel(id: string) {
  const f = await db.query.funnels.findFirst({ where: eq(funnels.id, id) });
  if (!f) return null;
  const [camp, [{ n }]] = await Promise.all([
    f.campaignId ? db.query.campaigns.findFirst({ where: eq(campaigns.id, f.campaignId), columns: { id: true, name: true, status: true, utmCampaign: true } }) : null,
    db.select({ n: sql<number>`count(*)` }).from(landingPages).where(eq(landingPages.funnelId, id)),
  ]);
  return { funnel: f, campaign: camp ?? null, landingCount: Number(n) };
}

export async function campaignOptions() {
  return db.select({ id: campaigns.id, name: campaigns.name, status: campaigns.status }).from(campaigns).where(sql`${campaigns.status} != 'CONCLUSO'`).orderBy(desc(campaigns.updatedAt));
}

/** Crea un funnel modificabile partendo da un modello. Con una campagna collegata eredita promessa, CTA, pubblico e reparto. */
export async function createFromTemplate(key: string, opts: { name: string; campaignId: string | null }, user: User) {
  const t = getTemplate(key);
  if (!t) throw new Error("Modello non trovato.");
  const camp = opts.campaignId ? await db.query.campaigns.findFirst({ where: eq(campaigns.id, opts.campaignId) }) : null;
  if (opts.campaignId && !camp) throw new Error("Campagna non trovata.");
  const p = camp?.plan;
  const [row] = await db
    .insert(funnels)
    .values({
      name: opts.name,
      templateKey: t.key,
      campaignId: camp?.id ?? null,
      status: "BOZZA",
      reparto: camp?.reparto ?? t.reparto,
      objective: t.obiettivo,
      audience: p?.audience.length ? p.audience.map((a) => a.nome).join(", ") : t.pubblico,
      promise: p?.promessa || t.promessa,
      leadMagnet: t.leadMagnet,
      cta: p?.cta || t.cta,
      steps: t.steps,
      formFields: t.form,
      emails: t.emails,
      whatsapp: t.whatsapp,
      qualificationRules: p?.qualificazione.length ? p.qualificazione : t.qualificazione,
      ownerId: user.id,
    })
    .returning({ id: funnels.id });
  await audit(user, "funnel_creato", "funnel", row.id, `${opts.name} · modello ${t.nome}${camp ? ` · campagna ${camp.name}` : ""}`);
  return row.id;
}

export async function updateFunnel(id: string, input: FunnelInput, user: User): Promise<string> {
  const f = await db.query.funnels.findFirst({ where: eq(funnels.id, id) });
  if (!f) throw new Error("Funnel non trovato.");
  if (!funnelEditable(f.status)) throw new Error("Un funnel pubblicato non si modifica: duplicalo per creare una nuova versione.");
  if (input.campaignId) {
    const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, input.campaignId), columns: { id: true } });
    if (!c) throw new Error("Campagna non trovata.");
  }
  const tornaInRevisione = f.status === "APPROVATO";
  await db
    .update(funnels)
    .set({ ...input, ...(tornaInRevisione ? { status: "REVISIONE" as const } : {}) })
    .where(eq(funnels.id, id));
  await audit(user, "funnel_modificato", "funnel", id, input.name);
  return tornaInRevisione ? "Modifiche salvate. Il funnel era approvato: è tornato in revisione." : "Modifiche salvate.";
}

export async function changeFunnelStatus(id: string, to: WorkStatus, user: User) {
  const f = await db.query.funnels.findFirst({ where: eq(funnels.id, id) });
  if (!f) throw new Error("Funnel non trovato.");
  if (!canTransition(f.status, to, user.role, "funnel")) throw new Error(`Passaggio non consentito: da ${WORK_STATUS_UI[f.status].label} a ${WORK_STATUS_UI[to].label}.`);
  await db.update(funnels).set({ status: to }).where(eq(funnels.id, id));
  await audit(user, "funnel_stato", "funnel", id, `${WORK_STATUS_UI[f.status].label} → ${WORK_STATUS_UI[to].label}`);
}

export async function duplicateFunnel(id: string, user: User) {
  const f = await db.query.funnels.findFirst({ where: eq(funnels.id, id) });
  if (!f) throw new Error("Funnel non trovato.");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, createdAt, updatedAt, status, ownerId, ...resto } = f;
  const [row] = await db
    .insert(funnels)
    .values({ ...resto, name: `${f.name} (copia)`.slice(0, 120), status: "BOZZA", ownerId: user.id })
    .returning({ id: funnels.id });
  await audit(user, "funnel_duplicato", "funnel", row.id, `da ${f.name}`);
  return row.id;
}

export async function deleteFunnel(id: string, user: User) {
  const f = await db.query.funnels.findFirst({ where: eq(funnels.id, id) });
  if (!f) throw new Error("Funnel non trovato.");
  if (f.status !== "BOZZA") throw new Error("Si possono eliminare solo i funnel in bozza.");
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(landingPages).where(eq(landingPages.funnelId, id));
  if (Number(n) > 0) throw new Error("Il funnel ha landing page collegate: non si può eliminare.");
  await db.delete(funnels).where(eq(funnels.id, id));
  await audit(user, "funnel_eliminato", "funnel", id, f.name);
}
