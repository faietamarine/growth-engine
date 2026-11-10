import { toCsv } from "@/lib/csv";
/* ============================================================================
   Ponte verso CRM Nautilus EVO.

   Nautilus EVO oggi è una pagina condivisa senza server: non può ricevere un
   webhook. Il ponte è quindi un FILE di importazione, con i lead già scritti
   esattamente come il CRM li salva:
     - "lead-list"          (Lead Vendita)   ← reparti VENDITA e NOLEGGIO
     - "lead-service-list"  (Lead Service)   ← reparto SERVICE
   Campi e valori sono quelli di saveLead()/saveLeadService() del CRM (build bt).
   Quando il CRM passerà su server, lo stesso oggetto viaggerà via webhook.
   ============================================================================ */
import type { Lead, Channel } from "@/db/schema";
import { scoreBand } from "@/lib/leads/score";

export const NAUTILUS_FORMAT = "nautilus-evo-lead-import";
export const NAUTILUS_FORMAT_VERSION = 1;

/** Valori ammessi dal campo "Origine contatto" del Lead Vendita in Nautilus EVO. */
export const NAUTILUS_ORIGINI = [
  "Passaggio in sede",
  "Telefono",
  "Sito web",
  "Instagram / Facebook",
  "Passaparola / referral",
  "Fiera / evento",
  "Altro",
] as const;
export type NautilusOrigine = (typeof NAUTILUS_ORIGINI)[number];

export type NautilusLeadVendita = {
  id: string;
  nome: string;
  cognome: string;
  azienda: string;
  telefono: string;
  email: string;
  origine: NautilusOrigine;
  interesse: string;
  budget: number;
  zona: string;
  competitor: string;
  probabilita: 10 | 30 | 50 | 70 | 90;
  venditore: "MARCO";
  stato: "Qualificato";
  storicoStati: { stato: string; data: string }[];
  prossimoContatto: string;
  note: string;
  attivita: [];
  appuntamenti: [];
  createdAt: number;
  updatedAt: number;
};

export type NautilusLeadService = {
  id: string;
  nome: string;
  cognome: string;
  azienda: string;
  telefono: string;
  email: string;
  origine: "Richiesta cliente";
  interesse: string;
  responsabile: "DANIELE";
  stato: "Richiesta ricevuta";
  storicoStati: { stato: string; data: string }[];
  prossimoContatto: string;
  note: string;
  attivita: [];
  appuntamenti: [];
  createdAt: number;
  updatedAt: number;
};

export type NautilusImportFile = {
  formato: typeof NAUTILUS_FORMAT;
  versione: typeof NAUTILUS_FORMAT_VERSION;
  generatoIl: string;
  generatoDa: string;
  lotto: string;
  lead: NautilusLeadVendita[];
  leadService: NautilusLeadService[];
};

/** Data AAAA-MM-GG nel fuso di Pescara (come todayStr() del CRM). */
export function dataItalia(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(d);
}

/** Primo giorno lavorativo (lun–sab) dopo la data indicata: la nautica lavora anche il sabato. */
export function prossimoGiornoLavorativo(d: Date): string {
  const x = new Date(d.getTime());
  do x.setUTCDate(x.getUTCDate() + 1);
  while (new Date(dataItalia(x) + "T12:00:00Z").getUTCDay() === 0);
  return dataItalia(x);
}

export function origineNautilus(channel: Channel, utmSource = ""): NautilusOrigine {
  const src = utmSource.toLowerCase();
  switch (channel) {
    case "META":
      return "Instagram / Facebook";
    case "ORGANICO":
      return /insta|facebook|fb|meta/.test(src) ? "Instagram / Facebook" : "Sito web";
    case "EVENTO":
      return "Fiera / evento";
    case "REFERRAL":
      return "Passaparola / referral";
    case "WHATSAPP":
      return "Telefono";
    case "GOOGLE":
    case "EMAIL":
    case "SITO":
      return "Sito web";
    default:
      return "Altro";
  }
}

const fmtIt = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome" }).format(d);
};

/** Note leggibili dal venditore: tutto ciò che il CRM non ha come campo dedicato. */
export function noteNautilus(lead: Lead, campagna?: string | null): string {
  const c = lead.consents;
  const si = (b: boolean) => (b ? "sì" : "no");
  const utm = [lead.utm.source, lead.utm.medium, lead.utm.content].filter(Boolean).join(" / ");
  const risposte = Object.entries(lead.answers ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
  const righe = [
    "Da Nautica Growth Engine",
    campagna ? `Campagna: ${campagna}` : "",
    `Fonte: ${lead.sourceLabel || lead.channel}${utm ? ` (${utm})` : ""}`,
    lead.timeframe ? `Tempistica: ${lead.timeframe}` : "",
    lead.onSite ? "Contatto raccolto di persona all'evento" : lead.checkedInAt ? `Presente all'evento (${fmtIt(lead.checkedInAt.toISOString())})` : "",
    `Punteggio: ${lead.score}/100 (${scoreBand(lead.score)})`,
    `Consensi: privacy ${si(c.privacy)} · marketing ${si(c.marketing)} · profilazione ${si(c.profilazione)} (${fmtIt(c.il)})`,
    risposte ? `Risposte: ${risposte}` : "",
    lead.message ? `Messaggio: ${lead.message}` : "",
  ];
  return righe.filter(Boolean).join("\n");
}

function probabilita(score: number): 10 | 30 {
  return score >= 70 ? 30 : 10;
}

export function toNautilusVendita(lead: Lead, campagna: string | null, ora: Date): NautilusLeadVendita {
  const oggi = dataItalia(ora);
  const interesse = lead.reparto === "NOLEGGIO" && !/noleggio/i.test(lead.interest) ? `Noleggio: ${lead.interest}`.replace(/: $/, "") : lead.interest;
  return {
    id: `ge_${lead.id}`,
    nome: lead.firstName,
    cognome: lead.lastName,
    azienda: lead.company,
    telefono: lead.phone,
    email: lead.email,
    origine: origineNautilus(lead.channel, lead.utm.source),
    interesse,
    budget: lead.budget && lead.budget > 0 ? lead.budget : 0,
    zona: lead.zone,
    competitor: "",
    probabilita: probabilita(lead.score),
    venditore: "MARCO",
    stato: "Qualificato",
    storicoStati: [{ stato: "Qualificato", data: oggi }],
    prossimoContatto: prossimoGiornoLavorativo(ora),
    note: noteNautilus(lead, campagna),
    attivita: [],
    appuntamenti: [],
    createdAt: lead.createdAt.getTime(),
    updatedAt: ora.getTime(),
  };
}

export function toNautilusService(lead: Lead, campagna: string | null, ora: Date): NautilusLeadService {
  return {
    id: `ge_${lead.id}`,
    nome: lead.firstName,
    cognome: lead.lastName,
    azienda: lead.company,
    telefono: lead.phone,
    email: lead.email,
    origine: "Richiesta cliente",
    interesse: lead.interest,
    responsabile: "DANIELE",
    stato: "Richiesta ricevuta",
    storicoStati: [{ stato: "Richiesta ricevuta", data: dataItalia(ora) }],
    prossimoContatto: prossimoGiornoLavorativo(ora),
    note: noteNautilus(lead, campagna),
    attivita: [],
    appuntamenti: [],
    createdAt: lead.createdAt.getTime(),
    updatedAt: ora.getTime(),
  };
}

/** Costruisce il file di importazione. `campagne` = mappa id campagna → nome. */
export function buildNautilusImport(
  leads: Lead[],
  campagne: Map<string, string>,
  opts: { lotto: string; utente: string; ora?: Date },
): NautilusImportFile {
  const ora = opts.ora ?? new Date();
  const nome = (l: Lead) => (l.campaignId ? (campagne.get(l.campaignId) ?? null) : null);
  return {
    formato: NAUTILUS_FORMAT,
    versione: NAUTILUS_FORMAT_VERSION,
    generatoIl: ora.toISOString(),
    generatoDa: `Nautica Growth Engine · ${opts.utente}`,
    lotto: opts.lotto,
    lead: leads.filter((l) => l.reparto !== "SERVICE").map((l) => toNautilusVendita(l, nome(l), ora)),
    leadService: leads.filter((l) => l.reparto === "SERVICE").map((l) => toNautilusService(l, nome(l), ora)),
  };
}

/** CSV con separatore ";" (si apre bene in Excel italiano), con protezione dalle formule. */
export function leadsToCsv(leads: Lead[], campagne: Map<string, string>): string {
  const head = ["Data", "Nome", "Cognome", "Azienda", "Telefono", "Email", "Reparto", "Interesse", "Budget", "Zona", "Tempistica", "Canale", "Fonte", "Campagna", "Punteggio", "Stato", "Consenso marketing"];
  return toCsv(
    head,
    leads.map((l) => [
      dataItalia(l.createdAt),
      l.firstName,
      l.lastName,
      l.company,
      l.phone,
      l.email,
      l.reparto,
      l.interest,
      l.budget ?? "",
      l.zone,
      l.timeframe,
      l.channel,
      l.sourceLabel,
      l.campaignId ? (campagne.get(l.campaignId) ?? "") : "",
      l.score,
      l.status,
      l.consents.marketing ? "sì" : "no",
    ]),
  );
}
