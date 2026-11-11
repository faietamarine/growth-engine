import "server-only";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns, leads, tasks, users, type Campaign, type User, type WorkStatus, type Channel } from "@/db/schema";
import { audit } from "@/lib/audit";
import { canTransition, editScope } from "@/lib/campaigns/status";
import { diffDays, rescalePlan, slugify } from "@/lib/campaigns/generate";
import type { SaveCampaignInput } from "@/lib/campaigns/validation";
import type { CampaignPlan } from "@/types/campaign";
import { WORK_STATUS_UI } from "@/lib/labels";

/** UTM univoco: se esiste già aggiunge -2, -3… */
export async function uniqueUtm(base: string, excludeId?: string): Promise<string> {
  const b = slugify(base, 54) || "campagna";
  const rows = await db.select({ id: campaigns.id, utm: campaigns.utmCampaign }).from(campaigns).where(like(campaigns.utmCampaign, `${b}%`));
  const usati = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.utm));
  if (!usati.has(b)) return b;
  for (let i = 2; ; i++) if (!usati.has(`${b}-${i}`)) return `${b}-${i}`;
}

/** I numeri del piano li rifà sempre il server: il browser non può alterare budget, stime o KPI. */
function ricalcola(plan: CampaignPlan, budget: number, start: string, end: string, leadTarget?: number) {
  const durata = Math.max(1, diffDays(end, start));
  const r = rescalePlan(plan, budget, durata, leadTarget);
  return { plan: { ...plan, canali: r.canali, kpi: r.kpi }, leadTarget: r.leadTarget };
}

export async function createCampaign(input: SaveCampaignInput, user: User) {
  if (input.endDate <= input.startDate) throw new Error("La data di fine deve essere dopo l'inizio.");
  const utm = await uniqueUtm(input.utmBase);
  const { plan, leadTarget } = ricalcola(input.plan, input.budget, input.startDate, input.endDate, input.leadTarget || undefined);
  const [row] = await db
    .insert(campaigns)
    .values({ name: input.name, objective: input.objective, reparto: input.reparto, brand: input.brand ?? null, status: "BOZZA", startDate: input.startDate, endDate: input.endDate, budget: input.budget, leadTarget, utmCampaign: utm, plan, ownerId: user.id })
    .returning({ id: campaigns.id });
  await audit(user, "campagna_creata", "campagna", row.id, `${input.name} · generata da ${plan.generatoDa}`);
  return row.id;
}

export async function listCampaigns(f: { stato?: WorkStatus; q?: string }) {
  const cond = [];
  if (f.stato) cond.push(eq(campaigns.status, f.stato));
  if (f.q) cond.push(or(like(campaigns.name, `%${f.q}%`), like(campaigns.objective, `%${f.q}%`), like(campaigns.utmCampaign, `%${f.q}%`)));
  const [rows, conteggi, leadPer] = await Promise.all([
    db.select().from(campaigns).where(cond.length ? and(...cond) : undefined).orderBy(desc(campaigns.updatedAt)),
    db.select({ status: campaigns.status, n: sql<number>`count(*)` }).from(campaigns).groupBy(campaigns.status),
    db
      .select({ id: leads.campaignId, tot: sql<number>`count(*)`, qual: sql<number>`sum(case when ${leads.status} in ('QUALIFICATO','CONSEGNATO') then 1 else 0 end)` })
      .from(leads)
      .groupBy(leads.campaignId),
  ]);
  const m = new Map(leadPer.map((l) => [l.id, l]));
  return {
    rows: rows.map((r) => ({ ...r, leadTot: Number(m.get(r.id)?.tot ?? 0), leadQual: Number(m.get(r.id)?.qual ?? 0) })),
    conteggi: Object.fromEntries(conteggi.map((c) => [c.status, Number(c.n)])) as Partial<Record<WorkStatus, number>>,
  };
}

export async function getCampaign(id: string) {
  const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!c) return null;
  const [ls, owner, tsk] = await Promise.all([
    db.select({ status: leads.status, channel: leads.channel }).from(leads).where(eq(leads.campaignId, id)),
    c.ownerId ? db.query.users.findFirst({ where: eq(users.id, c.ownerId), columns: { name: true } }) : null,
    db.select().from(tasks).where(eq(tasks.campaignId, id)).orderBy(tasks.dueDate),
  ]);
  const qual = ls.filter((l) => l.status === "QUALIFICATO" || l.status === "CONSEGNATO").length;
  const perCanale = new Map<Channel, number>();
  for (const l of ls) perCanale.set(l.channel, (perCanale.get(l.channel) ?? 0) + 1);
  return {
    campaign: c,
    ownerName: owner?.name ?? null,
    tasks: tsk,
    leads: {
      tot: ls.length,
      qual,
      consegnati: ls.filter((l) => l.status === "CONSEGNATO").length,
      perCanale,
      cpl: qual > 0 ? c.spent / qual : null,
    },
  };
}

export async function changeStatus(id: string, to: WorkStatus, user: User) {
  const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!c) throw new Error("Campagna non trovata.");
  if (!canTransition(c.status, to, user.role)) throw new Error(`Passaggio non consentito: da ${WORK_STATUS_UI[c.status].label} a ${WORK_STATUS_UI[to].label}.`);
  if (to === "PUBBLICATO" && !c.startDate) throw new Error("Imposta la data di inizio prima di avviare la campagna.");
  await db.update(campaigns).set({ status: to }).where(eq(campaigns.id, id));
  await audit(user, "campagna_stato", "campagna", id, `${WORK_STATUS_UI[c.status].label} → ${WORK_STATUS_UI[to].label}`);
}

export type UpdateInput = {
  name?: string;
  objective?: string;
  reparto?: Campaign["reparto"];
  startDate?: string;
  endDate?: string;
  budget?: number;
  spent?: number;
  leadTarget?: number;
  plan?: Partial<Pick<CampaignPlan, "angolo" | "promessa" | "offerta" | "cta" | "hook" | "painPoint" | "desideri" | "obiezioni" | "asset" | "metriche" | "qualificazione" | "audience">>;
};

/** Applica una modifica rispettando ciò che lo stato consente. Ritorna un messaggio per l'utente. */
export async function updateCampaign(id: string, u: UpdateInput, user: User): Promise<string> {
  const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!c) throw new Error("Campagna non trovata.");
  const scope = editScope(c.status);
  const set: Partial<typeof campaigns.$inferInsert> = {};
  const cambi: string[] = [];

  if (u.spent !== undefined && u.spent !== c.spent) {
    set.spent = u.spent;
    cambi.push(`spesa ${c.spent} → ${u.spent} €`);
  }
  if (scope !== "spesa") {
    const end = u.endDate ?? c.endDate;
    const start = scope === "tutto" ? (u.startDate ?? c.startDate) : c.startDate;
    if (start && end && end <= start) throw new Error("La data di fine deve essere dopo l'inizio.");
    if (u.endDate && u.endDate !== c.endDate) {
      set.endDate = u.endDate;
      cambi.push("fine campagna");
    }
    if (u.leadTarget !== undefined && u.leadTarget !== c.leadTarget) {
      set.leadTarget = u.leadTarget;
      cambi.push("obiettivo lead");
    }
  }
  if (scope === "operativo" && (set.leadTarget !== undefined || set.endDate !== undefined) && c.startDate) {
    // Campagna in corso: KPI e stime si riallineano a obiettivo e durata nuovi.
    const r = ricalcola(c.plan, c.budget, c.startDate, set.endDate ?? c.endDate!, set.leadTarget ?? c.leadTarget);
    set.plan = r.plan;
  }
  let strategia = false;
  if (scope === "tutto") {
    if (u.name && u.name !== c.name) set.name = u.name;
    if (u.objective && u.objective !== c.objective) set.objective = u.objective;
    if (u.reparto && u.reparto !== c.reparto) set.reparto = u.reparto;
    if (u.startDate && u.startDate !== c.startDate) set.startDate = u.startDate;
    const budgetCambiato = u.budget !== undefined && u.budget !== c.budget;
    if (budgetCambiato) set.budget = u.budget;
    let plan: CampaignPlan = { ...c.plan, ...(u.plan ?? {}) };
    const durataCambiata = (set.startDate ?? c.startDate) !== c.startDate || (set.endDate ?? c.endDate) !== c.endDate;
    if (budgetCambiato || durataCambiata || set.leadTarget !== undefined) {
      // Obiettivo lead: se l'utente non l'ha toccato, si ricalcola con il nuovo budget.
      const r = ricalcola(plan, set.budget ?? c.budget, set.startDate ?? c.startDate!, set.endDate ?? c.endDate!, set.leadTarget);
      plan = r.plan;
      set.leadTarget = r.leadTarget;
    }
    set.plan = plan;
    strategia = Object.keys(set).some((k) => !["spent", "plan"].includes(k)) || JSON.stringify(plan) !== JSON.stringify(c.plan);
    if (strategia) cambi.push("piano");
  }
  if (!Object.keys(set).length || (!cambi.length && !strategia)) return "Nessuna modifica da salvare.";

  let msg = "Modifiche salvate.";
  if (strategia && c.status === "APPROVATO") {
    set.status = "REVISIONE";
    msg = "Modifiche salvate. La campagna era approvata: è tornata in revisione.";
  }
  await db.update(campaigns).set(set).where(eq(campaigns.id, id));
  await audit(user, "campagna_modificata", "campagna", id, cambi.join(", ") || "piano");
  return msg;
}

export async function duplicateCampaign(id: string, user: User) {
  const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!c) throw new Error("Campagna non trovata.");
  const utm = await uniqueUtm(c.utmCampaign.replace(/-\d+$/, ""));
  const [row] = await db
    .insert(campaigns)
    .values({ name: `${c.name} (copia)`.slice(0, 120), objective: c.objective, reparto: c.reparto, status: "BOZZA", startDate: c.startDate, endDate: c.endDate, budget: c.budget, spent: 0, leadTarget: c.leadTarget, utmCampaign: utm, plan: { ...c.plan, attivitaCreate: false }, ownerId: user.id })
    .returning({ id: campaigns.id });
  await audit(user, "campagna_duplicata", "campagna", row.id, `da ${c.name}`);
  return row.id;
}

export async function deleteCampaign(id: string, user: User) {
  const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!c) throw new Error("Campagna non trovata.");
  if (c.status !== "BOZZA") throw new Error("Si possono eliminare solo le campagne in bozza. Le altre si concludono.");
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(leads).where(eq(leads.campaignId, id));
  if (Number(n) > 0) throw new Error("La campagna ha già dei lead: non si può eliminare.");
  await db.delete(campaigns).where(eq(campaigns.id, id));
  await audit(user, "campagna_eliminata", "campagna", id, c.name);
}

const KIND: Record<string, string> = { preparazione: "asset", lancio: "lancio", contenuto: "post", controllo: "campagna", chiusura: "campagna" };

/** Trasforma il calendario del piano in attività (una volta sola), assegnate a chi crea. */
export async function createTasksFromPlan(id: string, user: User) {
  const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!c) throw new Error("Campagna non trovata.");
  if (c.plan.attivitaCreate) throw new Error("Le attività di questa campagna sono già state create.");
  const righe = c.plan.calendario.map((i) => ({
    title: i.attivita,
    kind: i.canale === "EMAIL" ? "email" : KIND[i.tipo] ?? "campagna",
    campaignId: id,
    assigneeId: c.ownerId ?? user.id,
    dueDate: i.data,
  }));
  await db.transaction(async (tx) => {
    if (righe.length) await tx.insert(tasks).values(righe);
    await tx.update(campaigns).set({ plan: { ...c.plan, attivitaCreate: true } }).where(eq(campaigns.id, id));
  });
  await audit(user, "attivita_create", "campagna", id, `${righe.length} attività dal calendario`);
  return righe.length;
}
