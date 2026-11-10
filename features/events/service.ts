import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns, events, landingPages, leads, tasks, users, type User, type WorkStatus } from "@/db/schema";
import { audit } from "@/lib/audit";
import { canTransition } from "@/lib/campaigns/status";
import { tipoOrDefault } from "@/lib/events/catalog";
import { blocchiIscrizione, fasciaDi, metricheEvento, programmaComunicazioni, type EventoInput } from "@/lib/events/logic";
import { scoreLead, scoreDaLead, isQualified } from "@/lib/leads/score";
import type { LeadInput } from "@/lib/leads/validation";
import { toCsv } from "@/lib/csv";
import { LEAD_STATUS_UI } from "@/lib/labels";
import { dataItalia } from "@/lib/crm/nautilus";
import { urlPubblico } from "@/lib/landing/url";
import { utmQuery } from "@/lib/campaigns/utm";
import { getMinScore } from "@/features/leads/service";
import { uniqueSlug } from "@/features/landing/service";

const QUALIFICATI = ["QUALIFICATO", "CONSEGNATO"];

/** Conteggi per evento: iscritti (dalla pagina), presenti, raccolti sul posto, qualificati, consegnati. */
async function conteggi(ids?: string[]) {
  const rows = await db
    .select({
      eventId: leads.eventId,
      iscritti: sql<number>`sum(case when ${leads.onSite} = 0 then 1 else 0 end)`,
      presenti: sql<number>`sum(case when ${leads.onSite} = 0 and ${leads.checkedInAt} is not null then 1 else 0 end)`,
      sulPosto: sql<number>`sum(case when ${leads.onSite} = 1 then 1 else 0 end)`,
      qualificati: sql<number>`sum(case when ${leads.status} in ('QUALIFICATO','CONSEGNATO') then 1 else 0 end)`,
      consegnati: sql<number>`sum(case when ${leads.status} = 'CONSEGNATO' then 1 else 0 end)`,
    })
    .from(leads)
    .where(ids ? and(isNotNull(leads.eventId), inArray(leads.eventId, ids)) : isNotNull(leads.eventId))
    .groupBy(leads.eventId);
  return new Map(rows.map((r) => [r.eventId!, { iscritti: Number(r.iscritti ?? 0), presenti: Number(r.presenti ?? 0), sulPosto: Number(r.sulPosto ?? 0), qualificati: Number(r.qualificati ?? 0), consegnati: Number(r.consegnati ?? 0) }]));
}
const ZERO = { iscritti: 0, presenti: 0, sulPosto: 0, qualificati: 0, consegnati: 0 };

export async function listEvents() {
  const rows = await db
    .select({ e: events, campaignName: campaigns.name })
    .from(events)
    .leftJoin(campaigns, eq(events.campaignId, campaigns.id))
    .orderBy(asc(events.date));
  const [c, pagine] = await Promise.all([conteggi(), db.select({ id: landingPages.id, eventId: landingPages.eventId, status: landingPages.status }).from(landingPages).where(isNotNull(landingPages.eventId))]);
  const pag = new Map(pagine.map((p) => [p.eventId!, p]));
  return rows.map((r) => ({ ...r.e, campaignName: r.campaignName, numeri: c.get(r.e.id) ?? ZERO, landing: pag.get(r.e.id) ?? null }));
}

export async function getEvent(id: string, oggi = dataItalia(new Date())) {
  const e = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!e) return null;
  const [camp, landing, iscritti, owner, attivita, c] = await Promise.all([
    e.campaignId ? db.query.campaigns.findFirst({ where: eq(campaigns.id, e.campaignId), columns: { id: true, name: true, utmCampaign: true } }) : null,
    db.query.landingPages.findFirst({ where: eq(landingPages.eventId, id) }),
    db.select().from(leads).where(eq(leads.eventId, id)).orderBy(asc(leads.lastName), asc(leads.firstName)),
    e.ownerId ? db.query.users.findFirst({ where: eq(users.id, e.ownerId), columns: { id: true, name: true } }) : null,
    db.select({ id: tasks.id }).from(tasks).where(eq(tasks.eventId, id)),
    conteggi([id]),
  ]);
  const numeri = c.get(id) ?? ZERO;
  const tipo = tipoOrDefault(e.type);
  const link = landing?.publishedBlocks ? (canale: "EMAIL" | "WHATSAPP") => `${urlPubblico(landing.slug)}?${utmQuery(canale, camp?.utmCampaign ?? landing.slug)}` : undefined;
  return {
    evento: e,
    tipo,
    campaign: camp ?? null,
    landing: landing ?? null,
    linkIscrizione: landing?.publishedBlocks && landing.status === "PUBBLICATO" ? urlPubblico(landing.slug) : null,
    iscritti,
    owner: owner ?? null,
    attivitaCreate: attivita.length,
    numeri,
    metriche: metricheEvento({ ...numeri, capienza: e.capacity, spesa: e.spent }),
    comunicazioni: programmaComunicazioni(tipo, { nome: e.name, date: e.date, time: e.time, venue: e.venue }, link, oggi),
  };
}

export async function createEvent(input: EventoInput, user: User) {
  const [row] = await db
    .insert(events)
    .values({ ...input, status: "BOZZA", ownerId: user.id, checklist: {} })
    .returning({ id: events.id });
  await audit(user, "evento_creato", "evento", row.id, input.name);
  return row.id;
}

export async function updateEvent(id: string, input: EventoInput, user: User) {
  const e = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!e) throw new Error("Evento non trovato.");
  // Evento svolto: si aggiornano solo spesa e note (i dati del giorno restano quelli veri).
  const set = e.status === "CONCLUSO" ? { spent: input.spent, notes: input.notes } : input;
  await db.update(events).set(set).where(eq(events.id, id));
  await audit(user, "evento_modificato", "evento", id, e.status === "CONCLUSO" ? `spesa ${input.spent}` : input.name);
  return e.status === "CONCLUSO" ? "Evento svolto: aggiornate spesa e note." : "Evento salvato.";
}

export async function changeEventStatus(id: string, to: WorkStatus, user: User) {
  const e = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!e) throw new Error("Evento non trovato.");
  if (!canTransition(e.status, to, user.role, "evento")) throw new Error("Passaggio di stato non consentito.");
  await db.transaction(async (tx) => {
    await tx.update(events).set({ status: to }).where(eq(events.id, id));
    // Evento svolto: la pagina di iscrizione non deve più raccogliere iscrizioni.
    if (to === "CONCLUSO") await tx.update(landingPages).set({ status: "CONCLUSO" }).where(and(eq(landingPages.eventId, id), inArray(landingPages.status, ["PUBBLICATO", "PAUSA"])));
  });
  await audit(user, "evento_stato", "evento", id, `${e.status} → ${to}`);
}

export async function toggleChecklist(id: string, voce: string, fatto: boolean, user: User) {
  const e = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!e) throw new Error("Evento non trovato.");
  if (!tipoOrDefault(e.type).checklist.includes(voce)) throw new Error("Voce non valida.");
  await db.update(events).set({ checklist: { ...e.checklist, [voce]: fatto } }).where(eq(events.id, id));
  await audit(user, "evento_checklist", "evento", id, `${fatto ? "✓" : "✗"} ${voce}`);
}

/** Crea la pagina di iscrizione (landing in bozza) collegata all'evento e alla sua campagna. */
export async function createRegistrationLanding(id: string, user: User) {
  const e = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!e) throw new Error("Evento non trovato.");
  const esiste = await db.query.landingPages.findFirst({ where: eq(landingPages.eventId, id), columns: { id: true } });
  if (esiste) return esiste.id;
  const tipo = tipoOrDefault(e.type);
  const [row] = await db
    .insert(landingPages)
    .values({
      slug: await uniqueSlug(`${e.name}`),
      title: e.name,
      campaignId: e.campaignId,
      eventId: id,
      reparto: tipo.reparto,
      status: "BOZZA",
      blocks: blocchiIscrizione(e),
      ownerId: user.id,
    })
    .returning({ id: landingPages.id });
  await audit(user, "landing_creata", "landing", row.id, `Iscrizione evento: ${e.name}`);
  return row.id;
}

export async function setCheckIn(eventId: string, leadId: string, presente: boolean, user: User) {
  const l = await db.query.leads.findFirst({ where: and(eq(leads.id, leadId), eq(leads.eventId, eventId)) });
  if (!l) throw new Error("Iscritto non trovato.");
  if (l.onSite) return; // chi è registrato sul posto è presente per definizione
  // La presenza vale punti: un iscritto che si presenta può diventare qualificato (e andare al CRM).
  // I lead già consegnati o scartati non cambiano stato.
  const score = scoreDaLead(l, presente);
  const aperto = l.status === "NUOVO" || l.status === "QUALIFICATO" || l.status === "NON_QUALIFICATO";
  const status = aperto ? (isQualified(score, await getMinScore()) ? "QUALIFICATO" : "NON_QUALIFICATO") : l.status;
  await db.update(leads).set({ checkedInAt: presente ? new Date() : null, ...(aperto ? { score, status } : {}) }).where(eq(leads.id, leadId));
  await audit(user, presente ? "check_in" : "check_in_annullato", "lead", leadId, `evento ${eventId}`);
}

/** Contatto raccolto dallo staff durante l'evento (tablet): canale EVENTO, già presente. */
export async function createOnSiteLead(eventId: string, input: LeadInput, user: User) {
  const e = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!e) throw new Error("Evento non trovato.");
  const camp = e.campaignId ? await db.query.campaigns.findFirst({ where: eq(campaigns.id, e.campaignId) }) : null;
  const reparto = camp?.reparto ?? tipoOrDefault(e.type).reparto;
  const { score } = scoreLead({ reparto, email: input.email, interesse: input.interesse, budget: input.budget, tempistica: input.tempistica, zona: input.zona, messaggio: input.messaggio, consensoMarketing: input.consensoMarketing, presenteEvento: true });
  const minScore = await getMinScore();
  const ora = new Date();
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
      channel: "EVENTO",
      sourceLabel: `Evento: ${e.name}`,
      utm: { source: "evento", medium: "offline", campaign: camp?.utmCampaign },
      consents: { privacy: true, marketing: input.consensoMarketing, profilazione: input.consensoProfilazione, testoInformativa: input.versioneInformativa || "non indicata", il: ora.toISOString() },
      reparto,
      score,
      status: isQualified(score, minScore) ? "QUALIFICATO" : "NON_QUALIFICATO",
      campaignId: camp?.id ?? null,
      eventId,
      onSite: true,
      checkedInAt: ora,
    })
    .returning({ id: leads.id, status: leads.status, score: leads.score });
  await audit(user, "lead_evento", "lead", row.id, `${e.name} · punteggio ${score}`);
  return row;
}

/** Mette in calendario inviti, promemoria e follow-up dell'evento (una volta sola). */
export async function scheduleEventTasks(id: string, user: User) {
  const d = await getEvent(id);
  if (!d) throw new Error("Evento non trovato.");
  if (d.attivitaCreate > 0) throw new Error("Le attività di questo evento sono già in calendario.");
  const e = d.evento;
  const righe = [
    { title: `Pagina di iscrizione online – ${e.name}`, kind: "lancio", dueDate: d.comunicazioni[0]?.quando ?? e.date },
    ...d.comunicazioni.map((c) => ({ title: `${c.titolo} (${c.canale === "EMAIL" ? "email" : "WhatsApp"}) – ${e.name}`, kind: "email", dueDate: c.quando })),
    { title: `Checklist logistica completa – ${e.name}`, kind: "evento", dueDate: e.date },
  ].map((r) => ({ ...r, campaignId: e.campaignId, eventId: id, assigneeId: e.ownerId ?? user.id }));
  await db.insert(tasks).values(righe);
  await audit(user, "attivita_create", "evento", id, `${righe.length} attività`);
  return righe.length;
}

export async function deleteEvent(id: string, user: User) {
  const e = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!e) throw new Error("Evento non trovato.");
  if (e.status !== "BOZZA") throw new Error("Si eliminano solo gli eventi in bozza.");
  const [n] = await db.select({ n: sql<number>`count(*)` }).from(leads).where(eq(leads.eventId, id));
  if (Number(n.n) > 0) throw new Error("L'evento ha già iscritti: non si può eliminare.");
  await db.delete(events).where(eq(events.id, id));
  await audit(user, "evento_eliminato", "evento", id, e.name);
}

/** Lista iscritti per la stampa o per lo staff all'ingresso, con presenza e fascia oraria. */
export async function registrantsCsv(id: string) {
  const e = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!e) return null;
  const rows = await db.select().from(leads).where(eq(leads.eventId, id)).orderBy(asc(leads.onSite), asc(leads.lastName), asc(leads.firstName));
  const csv = toCsv(
    ["Cognome", "Nome", "Azienda", "Telefono", "Email", "Interesse", "Fascia oraria", "Iscritto il", "Presenza", "Consenso marketing", "Stato lead"],
    rows.map((l) => [
      l.lastName,
      l.firstName,
      l.company,
      l.phone,
      l.email,
      l.interest,
      fasciaDi(l.answers),
      dataItalia(l.createdAt),
      l.onSite ? "Raccolto sul posto" : l.checkedInAt ? "Presente" : "",
      l.consents.marketing ? "sì" : "no",
      LEAD_STATUS_UI[l.status].label,
    ]),
  );
  return { nome: e.name, csv };
}

export const QUALIFICATI_EVENTO = QUALIFICATI;
