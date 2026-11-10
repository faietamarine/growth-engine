/* ============================================================================
   Generatore di piani di campagna (funzioni pure, testate in tests/).
   Dall'obiettivo scritto dall'utente ricava: scenario, soggetto, reparto CRM,
   budget e ripartizione per canale, stime di lead, KPI, calendario e avvertenze.
   ============================================================================ */
import type { Channel, Reparto } from "@/db/schema";
import type { CampaignPlan, PlanCalendarItem, PlanChannel, PlanKpi } from "@/types/campaign";
import { CPL_RIFERIMENTO, LEAD_ORGANICI_30GG, SCENARI, SCENARIO_GENERICO, type Scenario } from "./scenarios";

export type GenerateInput = {
  obiettivo: string;
  reparto?: Reparto | "AUTO";
  dataInizio: string; // AAAA-MM-GG
  durataGiorni: number;
  budget?: number;
  leadTarget?: number;
  dettagli?: string;
  oggi: string; // AAAA-MM-GG (passato dall'esterno: rende il generatore testabile)
};

export type GeneratedCampaign = {
  name: string;
  objective: string;
  reparto: Reparto;
  startDate: string;
  endDate: string;
  budget: number;
  leadTarget: number;
  utmBase: string;
  plan: CampaignPlan;
};

// ---------------------------------------------------------------------------
// Date (solo stringhe AAAA-MM-GG, calcolate in UTC a mezzogiorno: niente sorprese con l'ora legale)
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000);
}

// ---------------------------------------------------------------------------
export function detectScenario(testo: string): Scenario {
  for (const s of SCENARI) if (s.parole.some((r) => r.test(testo))) return s;
  return SCENARIO_GENERICO;
}

const MARCHI: [RegExp, string][] = [
  [/joker/i, "Joker Boat"],
  [/capelli/i, "Capelli"],
  [/yamaha/i, "Yamaha"],
  [/jeanneau/i, "Jeanneau"],
  [/invictus/i, "Invictus"],
  [/capoforte/i, "Capoforte"],
  [/italmar/i, "Italmar"],
  [/blumax/i, "Blumax"],
];

// [riconoscimento, nome plurale, genere]
const TIPI: [RegExp, string, "m" | "f"][] = [
  [/vel[ae]\b|velier/i, "barche a vela", "f"],
  [/gommon/i, "gommoni", "m"],
  [/cabinat/i, "cabinati", "m"],
  [/moto d.acqua|waverunner|jet ?ski/i, "moto d'acqua", "f"],
  [/fuoribordo|motori\b/i, "motori fuoribordo", "m"],
  [/yacht/i, "yacht", "m"],
  [/\bopen\b|barche a motore/i, "barche open", "f"],
];

/** Ricava "cosa" si promuove dall'obiettivo (es. "barche a vela usate"). null = non riconosciuto. */
export function extractSubject(testo: string): string | null {
  const marchio = MARCHI.find(([r]) => r.test(testo))?.[1];
  const tipo = TIPI.find(([r]) => r.test(testo));
  const usato = /usat/i.test(testo);
  const nuovo = /\bnuov/i.test(testo);
  if (!tipo && !marchio) return null;
  if (!tipo) return `i modelli ${marchio}${usato ? " usati" : ""}`;
  const [, nome, genere] = tipo;
  const stato = usato ? (genere === "f" ? " usate" : " usati") : nuovo ? (genere === "f" ? " nuove" : " nuovi") : "";
  return `${nome}${marchio ? ` ${marchio}` : ""}${stato}`;
}

export function stagione(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  if (m >= 3 && m <= 5) return `Primavera ${y}`;
  if (m >= 6 && m <= 8) return `Estate ${y}`;
  if (m >= 9 && m <= 11) return `Autunno ${y}`;
  const inizio = m === 12 ? y : y - 1;
  return `Inverno ${inizio}-${String((inizio + 1) % 100).padStart(2, "0")}`;
}

export function slugify(t: string, max = 60): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** Migliaia sempre separate (1.000 €), come nel CRM. */
const num = (n: number) => new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0, useGrouping: "always" }).format(n);
const round50 = (n: number) => Math.max(0, Math.round(n / 50) * 50);
const cap = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** Budget di default: base dello scenario riferita a 60 giorni, proporzionata alla durata (minimo 200 €). */
export function defaultBudget(s: Scenario, durataGiorni: number): number {
  return Math.max(200, round50((s.budgetBase60gg * durataGiorni) / 60));
}

/**
 * Ripartisce il budget sui canali secondo le quote. Gli importi sono interi e la loro somma
 * è ESATTAMENTE il budget: l'arrotondamento residuo va al canale con la quota più alta.
 */
export function allocateBudget(budget: number, mix: [Channel, number, string][], organici: [Channel, string][], durataGiorni: number): PlanChannel[] {
  const totQuote = mix.reduce((s, [, q]) => s + q, 0);
  const tot = Math.round(budget);
  const righe: PlanChannel[] = mix.map(([canale, quota, perche]) => {
    const q = totQuote ? Math.round((quota / totQuote) * 100) : 0;
    const b = totQuote ? Math.floor((tot * quota) / totQuote) : 0;
    return { canale, quota: q, budget: b, cplStimato: CPL_RIFERIMENTO[canale], leadStimati: 0, perche };
  });
  if (righe.length) {
    const resto = tot - righe.reduce((s, r) => s + r.budget, 0);
    const iMax = righe.reduce((im, r, i) => (r.quota > righe[im].quota ? i : im), 0);
    righe[iMax].budget += resto;
  }
  for (const r of righe) r.leadStimati = r.cplStimato > 0 ? Math.floor(r.budget / r.cplStimato) : 0;
  const org: PlanChannel[] = organici.map(([canale, perche]) => ({
    canale,
    quota: 0,
    budget: 0,
    cplStimato: 0,
    leadStimati: Math.round(((LEAD_ORGANICI_30GG[canale] ?? 2) * durataGiorni) / 30),
    perche,
  }));
  return [...righe, ...org];
}

/** Stime di lead e KPI a partire dai canali. */
export function computeKpi(s: Scenario, canali: PlanChannel[], budget: number, leadTargetInput?: number) {
  const leadTot = canali.reduce((t, c) => t + c.leadStimati, 0);
  const leadQualStimati = Math.round(leadTot * s.tassoQualifica);
  const leadTarget = leadTargetInput && leadTargetInput > 0 ? Math.round(leadTargetInput) : leadQualStimati;
  const kpi: PlanKpi[] = [
    { nome: "Lead totali stimati", target: leadTot },
    { nome: "Lead qualificati (obiettivo)", target: leadTarget },
    { nome: "Costo per lead qualificato", target: leadTarget > 0 ? Math.round(budget / leadTarget) : 0, unita: "€" },
    ...s.kpiExtra.map((k) => ({ nome: k.nome, target: Math.round(leadTarget * k.quota), unita: k.unita })),
  ];
  return { leadTot, leadQualStimati, leadTarget, kpi };
}

const ORDINE_TIPO: Record<PlanCalendarItem["tipo"], number> = { preparazione: 0, lancio: 1, contenuto: 2, controllo: 3, chiusura: 4 };

export function buildCalendar(s: Scenario, start: string, durata: number): PlanCalendarItem[] {
  const out: PlanCalendarItem[] = [];
  for (const [g, attivita, tipo, canale, rif] of s.calendario) {
    const giorno = rif === "fine" ? durata + g : g;
    out.push({ giorno, data: addDays(start, giorno), attivita, tipo, ...(canale ? { canale } : {}) });
  }
  // Controllo settimanale (al massimo 12) e test A/B a metà campagna.
  for (let g = 7, n = 0; g < durata && n < 12; g += 7, n++) {
    out.push({ giorno: g, data: addDays(start, g), attivita: "Controllo settimanale: costi, lead e qualità; ottimizzazione degli annunci", tipo: "controllo" });
  }
  if (durata >= 21) {
    const g = Math.min(14, Math.floor(durata / 2));
    out.push({ giorno: g, data: addDays(start, g), attivita: "Test A/B: seconda versione di titolo o immagine sull'annuncio migliore", tipo: "controllo" });
  }
  out.push({
    giorno: durata,
    data: addDays(start, durata),
    attivita: s.eventoAFine ? "Chiusura: report di presenze e lead consegnati a Nautilus EVO" : "Fine campagna: report finale e lead consegnati a Nautilus EVO",
    tipo: "chiusura",
  });
  return out.sort((a, b) => a.giorno - b.giorno || ORDINE_TIPO[a.tipo] - ORDINE_TIPO[b.tipo]);
}

export function buildWarnings(s: Scenario, reparto: Reparto, start: string, oggi: string, calendario: PlanCalendarItem[], canali: PlanChannel[], extra: string[]): string[] {
  const w: string[] = [...extra];
  const m = Number(start.slice(5, 7));
  const inverno = [11, 12, 1, 2].includes(m);
  if (s.key === "noleggio" && [10, 11, 12, 1, 2].includes(m)) w.push("Partenza fuori stagione: utile per le prenotazioni anticipate, ma le richieste vere arrivano da aprile. Valuta un budget ridotto fino a marzo.");
  if (s.key === "noleggio" && [7, 8].includes(m)) w.push("Alta stagione: le richieste vanno chiuse in giornata, rispondi entro 2 ore.");
  if ((s.key === "prova-mare" || s.key === "open-day") && inverno) w.push("In inverno le prove in mare dipendono dal meteo: raccogli ora le richieste e proponi le date da marzo.");
  if (s.key === "manutenzione" && [6, 7, 8].includes(m)) w.push("In piena stagione l'officina è satura: punta sugli interventi urgenti o sulla prenotazione del rimessaggio invernale.");
  if (s.key === "manutenzione" && [1, 2, 3].includes(m)) w.push("Periodo ideale: chi prenota ora va in mare per primo.");
  if (s.key === "permuta" && [9, 10, 11].includes(m)) w.push("Fine stagione: il momento migliore per ritirare l'usato e rivenderlo in primavera.");
  if (s.eventoAFine) w.push("Il giorno dell'evento coincide con la data di fine campagna: se cambia la data dell'evento, aggiorna la fine.");

  const primo = calendario[0];
  if (primo && primo.data < oggi) {
    const giorniPrep = -primo.giorno;
    w.push(`La preparazione richiede ${giorniPrep} giorni prima della partenza: con questa data alcune attività sono già in ritardo. Partenza consigliata dal ${formatIt(addDays(oggi, giorniPrep))}.`);
  }
  if (canali.some((c) => c.canale === "EMAIL" || c.canale === "WHATSAPP")) w.push("Email e WhatsApp promozionali solo ai contatti con consenso marketing (in Nautilus EVO: scheda cliente, Privacy).");
  if (reparto === "NOLEGGIO") w.push("Nautilus EVO non ha una pipeline lead noleggio: questi lead arrivano nei Lead Vendita con interesse \"Noleggio: …\".");
  w.push("Costi per lead e conversioni sono stime di partenza: dopo due settimane sostituiscile con i dati reali.");
  return w;
}

export function formatIt(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const fill = (t: string, soggetto: string) => cap(t.replaceAll("{s}", soggetto));

/** Genera il piano completo. Deterministico: stesso input, stesso piano. */
export function generateCampaign(input: GenerateInput, now = new Date()): GeneratedCampaign {
  const testo = `${input.obiettivo} ${input.dettagli ?? ""}`;
  const s = detectScenario(testo);
  const estratto = s.soggettoFisso ? null : extractSubject(testo);
  const soggetto = estratto ?? s.soggettoDefault;
  const reparto: Reparto = input.reparto && input.reparto !== "AUTO" ? input.reparto : s.reparto;
  const durata = Math.round(input.durataGiorni);
  const startDate = input.dataInizio;
  const endDate = addDays(startDate, durata);
  const budget = input.budget !== undefined && input.budget >= 0 ? Math.round(input.budget) : defaultBudget(s, durata);

  const canali = allocateBudget(budget, s.mix, s.organici, durata);
  const { leadQualStimati, leadTarget, kpi } = computeKpi(s, canali, budget, input.leadTarget);

  const extra: string[] = [];
  if (input.leadTarget && leadTarget > leadQualStimati * 1.2) {
    const serve = leadQualStimati > 0 ? round50((budget * leadTarget) / leadQualStimati) : null;
    extra.push(
      serve
        ? `Obiettivo ambizioso: con ${num(budget)} € si stimano circa ${leadQualStimati} lead qualificati. Per arrivare a ${leadTarget} servirebbero circa ${num(serve)} €, oppure più canali senza spesa.`
        : `Con questo budget non si stimano lead a pagamento: l'obiettivo di ${leadTarget} lead dipende solo dai canali senza spesa.`,
    );
  }
  if (budget === 0) extra.push("Budget a zero: la campagna conta solo su canali senza spesa (social organici, sito, clienti).");

  const calendario = buildCalendar(s, startDate, durata);
  const avvertenze = buildWarnings(s, reparto, startDate, input.oggi, calendario, canali, extra);

  const nome = `${s.titolo}${estratto ? ` — ${cap(estratto)}` : ""} · ${stagione(startDate)}`;
  const utmBase = slugify(`${s.key} ${estratto ?? ""} ${stagione(startDate)}`);

  const plan: CampaignPlan = {
    scenario: s.key,
    soggetto,
    generatoDa: "mock",
    generatoIl: now.toISOString(),
    kpi,
    audience: s.audience,
    angolo: fill(s.angolo, soggetto),
    promessa: fill(s.promessa, soggetto),
    hook: s.hook.map((h) => fill(h, soggetto)),
    painPoint: s.painPoint,
    desideri: s.desideri,
    obiezioni: s.obiezioni,
    offerta: fill(s.offerta, soggetto),
    cta: s.cta,
    funnel: s.funnel.map(([tipo, titolo, descrizione], i) => ({ ordine: i + 1, tipo, titolo, descrizione })),
    formFields: s.form,
    canali,
    calendario,
    asset: s.asset,
    metriche: s.metriche,
    qualificazione: s.qualificazione,
    avvertenze,
  };

  return { name: nome, objective: input.obiettivo.trim(), reparto, startDate, endDate, budget, leadTarget, utmBase, plan };
}

/** Ricalcola canali e KPI quando cambiano budget o obiettivo lead (le parole restano quelle salvate). */
export function rescalePlan(plan: CampaignPlan, budget: number, durataGiorni: number, leadTargetInput?: number) {
  const s = SCENARI.find((x) => x.key === plan.scenario) ?? SCENARIO_GENERICO;
  // Usa le quote salvate (che l'utente vede) invece di quelle di default dello scenario.
  const mix = plan.canali.filter((c) => c.quota > 0).map((c) => [c.canale, c.quota, c.perche] as [Channel, number, string]);
  const organici = plan.canali.filter((c) => c.quota === 0).map((c) => [c.canale, c.perche] as [Channel, string]);
  const canali = allocateBudget(budget, mix, organici, durataGiorni);
  const { leadTarget, kpi } = computeKpi(s, canali, budget, leadTargetInput);
  return { canali, kpi, leadTarget };
}
