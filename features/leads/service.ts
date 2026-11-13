import { avvisaNuovaRichiesta } from "@/lib/notify";
import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns, crmConfig, landingPages, leadDeliveries, leads, type Lead, type User } from "@/db/schema";
import { scoreLead, isQualified } from "@/lib/leads/score";
import type { LeadInput } from "@/lib/leads/validation";
import { buildNautilusImport, leadsToCsv } from "@/lib/crm/nautilus";
import { audit } from "@/lib/audit";
import { channelFromUtm } from "@/lib/campaigns/utm";

export async function getMinScore() {
  const c = await db.query.crmConfig.findFirst({ where: eq(crmConfig.id, "crm") });
  return c?.minScore ?? 40;
}

async function campaignNames() {
  const rows = await db.select({ id: campaigns.id, name: campaigns.name }).from(campaigns);
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** Salva un lead arrivato da form pubblico: collega la campagna dall'UTM, calcola punteggio e stato. */
export async function createLeadFromInput(input: LeadInput, ip?: string) {
  // Landing di provenienza: solo se pubblicata. Dà campagna (se manca l'UTM), reparto e variante del test.
  const landing = input.landing ? await db.query.landingPages.findFirst({ where: and(eq(landingPages.slug, input.landing), eq(landingPages.status, "PUBBLICATO")) }) : undefined;
  const utmCampaign = input.campagna || input.utm.campaign || "";
  let camp = utmCampaign ? await db.query.campaigns.findFirst({ where: eq(campaigns.utmCampaign, utmCampaign) }) : undefined;
  if (!camp && landing?.campaignId) camp = await db.query.campaigns.findFirst({ where: eq(campaigns.id, landing.campaignId) });
  // Il reparto della campagna prevale su quello della landing e su quello dichiarato dal form.
  const reparto = camp?.reparto ?? landing?.reparto ?? input.reparto;
  const variant = landing?.abTest?.attivo ? (input.variante ?? "A") : null;
  const { score } = scoreLead({ reparto, email: input.email, interesse: input.interesse, budget: input.budget, tempistica: input.tempistica, zona: input.zona, messaggio: input.messaggio, consensoMarketing: input.consensoMarketing });
  const minScore = await getMinScore();

  const [row] = await db
    .insert(leads)
    .values({
      firstName: input.nome,
      lastName: input.cognome,
      company: input.azienda,
      phone: input.telefono,
      email: input.email.toLowerCase(),
      interest: input.interesse,
      budget: input.budget ?? null,
      zone: input.zona,
      timeframe: input.tempistica,
      message: input.messaggio,
      answers: input.risposte,
      channel: input.canale ?? channelFromUtm(input.utm.source, input.utm.medium) ?? "SITO",
      sourceLabel: input.fonte || (landing ? (landing.eventId ? `Iscrizione evento: ${landing.title}` : `Landing: ${landing.title}`) : ""),
      utm: { ...input.utm, campaign: utmCampaign || camp?.utmCampaign || undefined },
      consents: {
        privacy: true,
        marketing: input.consensoMarketing,
        profilazione: input.consensoProfilazione,
        testoInformativa: input.versioneInformativa || "non indicata",
        il: new Date().toISOString(),
        ip,
      },
      reparto,
      score,
      status: isQualified(score, minScore) ? "QUALIFICATO" : "NON_QUALIFICATO",
      campaignId: camp?.id ?? null,
      landingPageId: landing?.id ?? null,
      // Pagina di iscrizione a un evento: il lead è un iscritto di quell'evento.
      eventId: landing?.eventId ?? null,
      variant,
    })
    .returning({ id: leads.id, status: leads.status, score: leads.score });
  if ((input.canale ?? "SITO") === "SITO") await avvisaNuovaRichiesta({ nome: `${input.nome} ${input.cognome}`.trim(), telefono: input.telefono, interesse: input.interesse, fonte: input.fonte });
  await audit(null, "lead_ricevuto", "lead", row.id, `${input.fonte || input.canale || "form"} · punteggio ${score}`);
  return row;
}

export type LeadView = "coda" | "consegnati" | "non-qualificati" | "tutti";

export async function listLeads(view: LeadView) {
  const where =
    view === "coda" ? eq(leads.status, "QUALIFICATO") : view === "consegnati" ? eq(leads.status, "CONSEGNATO") : view === "non-qualificati" ? inArray(leads.status, ["NON_QUALIFICATO", "SCARTATO"]) : undefined;
  const [rows, nomi, conteggi] = await Promise.all([
    db.select().from(leads).where(where).orderBy(desc(leads.createdAt)).limit(300),
    campaignNames(),
    db.select({ status: leads.status }).from(leads),
  ]);
  const count = (s: string[]) => conteggi.filter((c) => s.includes(c.status)).length;
  return {
    rows: rows.map((r) => ({ ...r, campaignName: r.campaignId ? (nomi.get(r.campaignId) ?? null) : null })),
    counts: { coda: count(["QUALIFICATO"]), consegnati: count(["CONSEGNATO"]), "non-qualificati": count(["NON_QUALIFICATO", "SCARTATO"]), tutti: conteggi.length } as Record<LeadView, number>,
  };
}

export async function listDeliveries() {
  return db.select().from(leadDeliveries).orderBy(desc(leadDeliveries.createdAt)).limit(10);
}

function nuovoLotto(now = new Date()) {
  const d = now.toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return `GE-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Consegna a Nautilus EVO: prende i lead qualificati non ancora consegnati, costruisce il file
 * di importazione e li segna come CONSEGNATI nello stesso passaggio (nessun lead esportato due volte).
 */
export async function exportPendingToNautilus(user: User) {
  const lotto = nuovoLotto();
  const ora = new Date();
  const nomi = await campaignNames();
  const result = await db.transaction(async (tx) => {
    const pending = await tx.select().from(leads).where(and(eq(leads.status, "QUALIFICATO"), isNull(leads.deliveredAt)));
    if (pending.length === 0) return null;
    await tx
      .update(leads)
      .set({ status: "CONSEGNATO", deliveredAt: ora, deliveryBatch: lotto })
      .where(inArray(leads.id, pending.map((p) => p.id)));
    await tx.insert(leadDeliveries).values({ batch: lotto, method: "EXPORT_NAUTILUS", leadCount: pending.length, status: "OK", userId: user.id });
    return pending;
  });
  if (!result) return null;
  await audit(user, "consegna_crm", "lead", null, `${result.length} lead · lotto ${lotto}`);
  return buildNautilusImport(result, nomi, { lotto, utente: user.name, ora });
}

/** Scarica di nuovo un lotto già consegnato (nessuna modifica ai dati). */
export async function rebuildBatch(lotto: string, user: User) {
  const rows = await db.select().from(leads).where(eq(leads.deliveryBatch, lotto));
  if (!rows.length) return null;
  return buildNautilusImport(rows, await campaignNames(), { lotto, utente: user.name });
}

export async function exportCsv(view: LeadView) {
  const { rows } = await listLeads(view);
  return leadsToCsv(rows as Lead[], await campaignNames());
}

export async function setLeadStatus(id: string, status: "QUALIFICATO" | "SCARTATO", user: User) {
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
  if (!lead) throw new Error("Lead non trovato.");
  if (lead.status === "CONSEGNATO") throw new Error("Il lead è già nel CRM: modificalo da Nautilus EVO.");
  await db.update(leads).set({ status }).where(eq(leads.id, id));
  await audit(user, status === "QUALIFICATO" ? "lead_qualificato_a_mano" : "lead_scartato", "lead", id, `${lead.firstName} ${lead.lastName} · punteggio ${lead.score}`);
}
