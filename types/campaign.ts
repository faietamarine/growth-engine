import type { Channel, FormField, FunnelStep } from "@/db/schema";

/* Piano di campagna salvato in campaigns.plan (JSON).
   Regola: i NUMERI (budget per canale, stime, KPI, date) li calcola sempre il codice;
   l'AI, quando attiva, scrive solo le PAROLE. Così le cifre restano verificabili. */

export type PlanKpi = { nome: string; target: number; unita?: string };
export type PlanSegment = { nome: string; descrizione: string };
export type PlanObjection = { obiezione: string; risposta: string };
export type PlanFunnelStep = { ordine: number; tipo: FunnelStep["tipo"]; titolo: string; descrizione: string };

export type PlanChannel = {
  canale: Channel;
  quota: number; // % del budget, intero 0–100
  budget: number; // € interi; la somma dei canali = budget della campagna
  cplStimato: number; // € per lead (stima di riferimento, 0 = canale senza spesa)
  leadStimati: number;
  perche: string;
};

export type PlanCalendarItem = {
  giorno: number; // giorni rispetto alla partenza (negativo = preparazione)
  data: string; // AAAA-MM-GG
  attivita: string;
  tipo: "preparazione" | "lancio" | "contenuto" | "controllo" | "chiusura";
  canale?: Channel;
};

export type CampaignPlan = {
  scenario: string;
  soggetto: string;
  generatoDa: "mock" | "anthropic";
  generatoIl: string;
  kpi: PlanKpi[];
  audience: PlanSegment[];
  angolo: string;
  promessa: string;
  hook: string[];
  painPoint: string[];
  desideri: string[];
  obiezioni: PlanObjection[];
  offerta: string;
  cta: string;
  funnel: PlanFunnelStep[];
  formFields: FormField[];
  canali: PlanChannel[];
  calendario: PlanCalendarItem[];
  asset: string[];
  metriche: string[];
  qualificazione: string[];
  avvertenze: string[];
  attivitaCreate?: boolean; // true quando il calendario è già diventato attività
};
