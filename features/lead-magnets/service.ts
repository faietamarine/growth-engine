import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns, leadMagnets, type User, type WorkStatus } from "@/db/schema";
import { audit } from "@/lib/audit";
import { canTransition, funnelEditable } from "@/lib/campaigns/status";
import { WORK_STATUS_UI } from "@/lib/labels";
import type { LeadMagnetContent } from "@/types/lead-magnet";
import { controllaLimiti } from "@/lib/leadmagnets/generate";

export async function listLeadMagnets(f: { stato?: WorkStatus; tipo?: string; campaignId?: string } = {}) {
  const cond = [];
  if (f.stato) cond.push(eq(leadMagnets.status, f.stato));
  if (f.tipo) cond.push(eq(leadMagnets.type, f.tipo));
  if (f.campaignId) cond.push(eq(leadMagnets.campaignId, f.campaignId));
  const rows = await db
    .select({ lm: leadMagnets, campaignName: campaigns.name })
    .from(leadMagnets)
    .leftJoin(campaigns, eq(leadMagnets.campaignId, campaigns.id))
    .where(cond.length ? and(...cond) : undefined)
    .orderBy(desc(leadMagnets.updatedAt));
  return rows.map((r) => ({ ...r.lm, campaignName: r.campaignName }));
}

export async function getLeadMagnet(id: string) {
  const lm = await db.query.leadMagnets.findFirst({ where: eq(leadMagnets.id, id) });
  if (!lm) return null;
  const camp = lm.campaignId ? await db.query.campaigns.findFirst({ where: eq(campaigns.id, lm.campaignId), columns: { id: true, name: true, utmCampaign: true } }) : null;
  return { lm, campaign: camp ?? null };
}

export async function createLeadMagnet(input: { title: string; content: LeadMagnetContent; campaignId: string | null }, user: User) {
  if (input.campaignId) {
    const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, input.campaignId), columns: { id: true } });
    if (!c) throw new Error("Campagna non trovata.");
  }
  const [row] = await db
    .insert(leadMagnets)
    .values({ type: input.content.tipo, title: input.title, campaignId: input.campaignId, status: "BOZZA", content: input.content, ownerId: user.id })
    .returning({ id: leadMagnets.id });
  await audit(user, "lead_magnet_creato", "lead_magnet", row.id, `${input.title} · ${input.content.tipo} · testi ${input.content.generatoDa}`);
  return row.id;
}

export async function updateLeadMagnet(id: string, input: { title: string; campaignId: string | null; content: LeadMagnetContent }, user: User) {
  const lm = await db.query.leadMagnets.findFirst({ where: eq(leadMagnets.id, id) });
  if (!lm) throw new Error("Lead magnet non trovato.");
  if (!funnelEditable(lm.status)) throw new Error("Un lead magnet pubblicato non si modifica: duplicalo per creare una nuova versione.");
  // Le spunte della checklist si gestiscono a parte: qui restano quelle salvate.
  const fatte = new Map(lm.content.checklist.map((c) => [c.voce, c.fatto]));
  const content = { ...input.content, tipo: lm.content.tipo, checklist: input.content.checklist.map((c) => ({ voce: c.voce, fatto: fatte.get(c.voce) ?? false })) };
  const torna = lm.status === "APPROVATO";
  await db
    .update(leadMagnets)
    .set({ title: input.title, campaignId: input.campaignId, content, ...(torna ? { status: "REVISIONE" as const } : {}) })
    .where(eq(leadMagnets.id, id));
  await audit(user, "lead_magnet_modificato", "lead_magnet", id, input.title);
  return torna ? "Modifiche salvate. Era approvato: è tornato in revisione." : "Modifiche salvate.";
}

/** Spunta una voce della checklist di pubblicazione (consentita in ogni stato tranne concluso). */
export async function toggleChecklist(id: string, index: number, fatto: boolean, user: User) {
  const lm = await db.query.leadMagnets.findFirst({ where: eq(leadMagnets.id, id) });
  if (!lm) throw new Error("Lead magnet non trovato.");
  if (lm.status === "CONCLUSO") throw new Error("Il lead magnet è concluso.");
  const voce = lm.content.checklist[index];
  if (!voce) throw new Error("Voce non trovata.");
  const checklist = lm.content.checklist.map((c, i) => (i === index ? { ...c, fatto } : c));
  await db.update(leadMagnets).set({ content: { ...lm.content, checklist } }).where(eq(leadMagnets.id, id));
  await audit(user, "checklist", "lead_magnet", id, `${fatto ? "✓" : "✗"} ${voce.voce}`);
}

export async function changeLeadMagnetStatus(id: string, to: WorkStatus, user: User) {
  const lm = await db.query.leadMagnets.findFirst({ where: eq(leadMagnets.id, id) });
  if (!lm) throw new Error("Lead magnet non trovato.");
  if (!canTransition(lm.status, to, user.role, "contenuto")) throw new Error(`Passaggio non consentito: da ${WORK_STATUS_UI[lm.status].label} a ${WORK_STATUS_UI[to].label}.`);
  if (to === "PUBBLICATO") {
    const mancanti = lm.content.checklist.filter((c) => !c.fatto).length;
    if (mancanti > 0) throw new Error(`Prima di pubblicare completa la checklist: mancano ${mancanti} voci.`);
    const google = controllaLimiti(lm.content).filter((x) => x.campo.startsWith("Google"));
    if (google.length) throw new Error(`Prima di pubblicare correggi gli annunci Google: ${google.map((g) => g.campo).join(", ")} oltre il limite.`);
  }
  await db.update(leadMagnets).set({ status: to }).where(eq(leadMagnets.id, id));
  await audit(user, "lead_magnet_stato", "lead_magnet", id, `${WORK_STATUS_UI[lm.status].label} → ${WORK_STATUS_UI[to].label}`);
}

export async function duplicateLeadMagnet(id: string, user: User) {
  const lm = await db.query.leadMagnets.findFirst({ where: eq(leadMagnets.id, id) });
  if (!lm) throw new Error("Lead magnet non trovato.");
  const [row] = await db
    .insert(leadMagnets)
    .values({ type: lm.type, title: `${lm.title} (copia)`.slice(0, 160), campaignId: lm.campaignId, status: "BOZZA", content: { ...lm.content, checklist: lm.content.checklist.map((c) => ({ ...c, fatto: false })) }, ownerId: user.id })
    .returning({ id: leadMagnets.id });
  await audit(user, "lead_magnet_duplicato", "lead_magnet", row.id, `da ${lm.title}`);
  return row.id;
}

export async function deleteLeadMagnet(id: string, user: User) {
  const lm = await db.query.leadMagnets.findFirst({ where: eq(leadMagnets.id, id) });
  if (!lm) throw new Error("Lead magnet non trovato.");
  if (lm.status !== "BOZZA") throw new Error("Si possono eliminare solo i lead magnet in bozza.");
  await db.delete(leadMagnets).where(eq(leadMagnets.id, id));
  await audit(user, "lead_magnet_eliminato", "lead_magnet", id, lm.title);
}

