import "server-only";
import { db } from "@/db/client";
import { campaigns, events, landingPages, leads, tasks, type Channel } from "@/db/schema";
import { dataItalia } from "@/lib/crm/nautilus";
import { chiaviPeriodo, costoPer, etichettaMese, etichettaSettimana, nelPeriodo, percento, periodo as calcolaPeriodo, settimanaDi, suggerimenti } from "@/lib/report/logic";
import { inRitardo } from "@/lib/calendar/logic";
import { diffDays } from "@/lib/campaigns/generate";

const QUAL = new Set(["QUALIFICATO", "CONSEGNATO"]);

/**
 * Report del periodo. Regole dei numeri (le stesse in tutta l'app):
 *  - un lead conta nel periodo in base alla data di arrivo;
 *  - "qualificati" = in coda verso il CRM + già consegnati;
 *  - spesa = spesa registrata delle campagne attive nel periodo (non ripartita per giorno: è un dato
 *    inserito a mano, quindi lo mostriamo intero) → il costo per lead si legge per campagna;
 *  - conversione landing = lead / visite (visite totali dalla pubblicazione, A + B).
 */
export async function getReport(periodoKey: string | undefined, now = new Date()) {
  const oggi = dataItalia(now);
  const p = calcolaPeriodo(periodoKey, oggi);
  const [allLeads, allCampaigns, allLanding, allEvents, allTasks] = await Promise.all([
    db.select({ status: leads.status, channel: leads.channel, campaignId: leads.campaignId, landingPageId: leads.landingPageId, eventId: leads.eventId, createdAt: leads.createdAt, deliveredAt: leads.deliveredAt, onSite: leads.onSite, checkedInAt: leads.checkedInAt }).from(leads),
    db.select().from(campaigns),
    db.select({ id: landingPages.id, title: landingPages.title, slug: landingPages.slug, visits: landingPages.visits, visitsB: landingPages.visitsB, abTest: landingPages.abTest, status: landingPages.status }).from(landingPages),
    db.select().from(events),
    db.select().from(tasks),
  ]);

  const ls = allLeads.filter((l) => nelPeriodo(dataItalia(l.createdAt), p));
  const qual = ls.filter((l) => QUAL.has(l.status));
  const consegnatiNelPeriodo = allLeads.filter((l) => l.deliveredAt && nelPeriodo(dataItalia(l.deliveredAt), p)).length;

  // Campagne che si sovrappongono al periodo.
  const campagne = allCampaigns
    .filter((c) => (c.startDate ?? "0000") <= p.a && (c.endDate ?? "9999") >= p.da && c.status !== "BOZZA")
    .map((c) => {
      const lc = ls.filter((l) => l.campaignId === c.id);
      const q = lc.filter((l) => QUAL.has(l.status)).length;
      return {
        id: c.id,
        nome: c.name,
        stato: c.status,
        budget: c.budget,
        spesa: c.spent,
        lead: lc.length,
        qualificati: q,
        cpl: costoPer(c.spent, q),
        cplObiettivo: c.leadTarget > 0 ? Math.round(c.budget / c.leadTarget) : null,
        avanzamentoBudget: percento(c.spent, c.budget),
        obiettivoLead: c.leadTarget,
      };
    })
    .sort((a, b) => b.qualificati - a.qualificati);

  const canaliMap = new Map<Channel, { lead: number; qualificati: number }>();
  for (const l of ls) {
    const x = canaliMap.get(l.channel) ?? { lead: 0, qualificati: 0 };
    x.lead++;
    if (QUAL.has(l.status)) x.qualificati++;
    canaliMap.set(l.channel, x);
  }
  const canali = [...canaliMap.entries()].map(([canale, v]) => ({ canale, ...v, tasso: percento(v.qualificati, v.lead) })).sort((a, b) => b.lead - a.lead);

  const landing = allLanding
    .filter((l) => l.status !== "BOZZA")
    .map((l) => {
      const tutti = allLeads.filter((x) => x.landingPageId === l.id);
      const visite = l.visits + l.visitsB;
      return { id: l.id, titolo: l.title, visite, lead: tutti.length, leadPeriodo: tutti.filter((x) => nelPeriodo(dataItalia(x.createdAt), p)).length, conversione: percento(tutti.length, visite), abAttivo: !!l.abTest?.attivo };
    })
    .sort((a, b) => b.lead - a.lead);

  const eventi = allEvents
    .filter((e) => nelPeriodo(e.date, p))
    .map((e) => {
      const le = allLeads.filter((l) => l.eventId === e.id);
      const iscritti = le.filter((l) => !l.onSite).length;
      const presenti = le.filter((l) => !l.onSite && l.checkedInAt).length;
      const sulPosto = le.filter((l) => l.onSite).length;
      const q = le.filter((l) => QUAL.has(l.status)).length;
      return { id: e.id, campaignId: e.campaignId, nome: e.name, data: e.date, stato: e.status, iscritti, presenti, sulPosto, qualificati: q, spesa: e.spent, cpl: costoPer(e.spent, iscritti + sulPosto), concluso: e.status === "CONCLUSO" };
    });

  // Produzione: attività con scadenza nel periodo (fino a oggi) — puntualità = fatte sul totale scaduto.
  const scadute = allTasks.filter((t) => nelPeriodo(t.dueDate, p) && t.dueDate <= oggi);
  const fatte = scadute.filter((t) => t.status === "FATTO").length;
  const ritardo = allTasks.filter((t) => inRitardo(t, oggi));
  const produzione = {
    scadute: scadute.length,
    fatte,
    puntualita: percento(fatte, scadute.length),
    inRitardo: ritardo.length,
    ritardoMedioGiorni: ritardo.length ? Math.round(ritardo.reduce((t, x) => t + diffDays(oggi, x.dueDate), 0) / ritardo.length) : 0,
  };

  // La spesa di un evento collegato a una campagna è già dentro la spesa della campagna (canale Evento del piano):
  // la sommiamo a parte solo per gli eventi senza campagna nel report, così non si conta due volte.
  const spesaTot = campagne.reduce((t, c) => t + c.spesa, 0) + eventi.filter((e) => !e.campaignId || !campagne.some((c) => c.id === e.campaignId)).reduce((t, e) => t + e.spesa, 0);

  const kpi = {
    lead: ls.length,
    qualificati: qual.length,
    tassoQualifica: percento(qual.length, ls.length),
    consegnati: consegnatiNelPeriodo,
    inCoda: allLeads.filter((l) => l.status === "QUALIFICATO").length,
    spesa: spesaTot,
    cplQualificato: costoPer(spesaTot, qual.length),
  };

  // Andamento: lead per settimana (periodi brevi) o per mese (anni).
  const perMese = p.key === "anno" || p.key === "nautico";
  const bucket = (d: string) => (perMese ? d.slice(0, 7) : settimanaDi(d));
  const serie = new Map<string, { lead: number; qualificati: number }>();
  for (const k of chiaviPeriodo(p.da, p.a, perMese)) serie.set(k, { lead: 0, qualificati: 0 });
  for (const l of ls) {
    const k = bucket(dataItalia(l.createdAt));
    const x = serie.get(k);
    if (!x) continue;
    x.lead++;
    if (QUAL.has(l.status)) x.qualificati++;
  }

  return {
    periodo: p,
    oggi,
    kpi,
    campagne,
    canali,
    landing,
    eventi,
    produzione,
    andamento: [...serie.entries()].map(([k, v]) => ({ etichetta: perMese ? etichettaMese(k) : etichettaSettimana(k), ...v })),
    suggerimenti: suggerimenti({
      landing: landing.map((l) => ({ titolo: l.titolo, visite: l.visite, lead: l.lead, abAttivo: l.abAttivo })),
      campagne: campagne.map((c) => ({ nome: c.nome, spesa: c.spesa, qualificati: c.qualificati, cplObiettivo: c.cplObiettivo, attiva: c.stato === "PUBBLICATO" })),
      canali,
      leadTotali: ls.length,
      nonQualificati: ls.filter((l) => l.status === "NON_QUALIFICATO" || l.status === "SCARTATO").length,
      inCoda: kpi.inCoda,
      attivitaInRitardo: ritardo.length,
      eventi,
    }),
  };
}
export type Report = Awaited<ReturnType<typeof getReport>>;

