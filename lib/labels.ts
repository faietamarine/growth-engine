import type { AssetStatus, Channel, LeadStatus, Reparto, TaskStatus, WorkStatus } from "@/db/schema";

export type Tone = "neutral" | "info" | "warn" | "ok" | "danger" | "gold" | "aqua";

export const WORK_STATUS_UI: Record<WorkStatus, { label: string; tone: Tone }> = {
  BOZZA: { label: "Bozza", tone: "neutral" },
  REVISIONE: { label: "In revisione", tone: "warn" },
  APPROVATO: { label: "Approvato", tone: "info" },
  PUBBLICATO: { label: "Pubblicato", tone: "ok" },
  PAUSA: { label: "In pausa", tone: "gold" },
  CONCLUSO: { label: "Concluso", tone: "neutral" },
};

export const ASSET_STATUS_UI: Record<AssetStatus, { label: string; tone: Tone }> = {
  IDEA: { label: "Idea", tone: "neutral" },
  BOZZA: { label: "Bozza", tone: "neutral" },
  REVISIONE: { label: "In revisione", tone: "warn" },
  APPROVATO: { label: "Approvato", tone: "info" },
  PUBBLICATO: { label: "Pubblicato", tone: "ok" },
};

export const TASK_STATUS_UI: Record<TaskStatus, { label: string; tone: Tone }> = {
  DA_FARE: { label: "Da fare", tone: "neutral" },
  IN_CORSO: { label: "In corso", tone: "info" },
  IN_REVISIONE: { label: "In revisione", tone: "warn" },
  FATTO: { label: "Fatto", tone: "ok" },
};

export const LEAD_STATUS_UI: Record<LeadStatus, { label: string; tone: Tone }> = {
  NUOVO: { label: "Nuovo", tone: "neutral" },
  QUALIFICATO: { label: "Da consegnare", tone: "gold" },
  NON_QUALIFICATO: { label: "Non qualificato", tone: "neutral" },
  CONSEGNATO: { label: "Consegnato al CRM", tone: "ok" },
  SCARTATO: { label: "Scartato", tone: "danger" },
};

export const REPARTO_UI: Record<Reparto, { label: string; tone: Tone }> = {
  VENDITA: { label: "Vendita", tone: "info" },
  SERVICE: { label: "Service", tone: "aqua" },
  NOLEGGIO: { label: "Noleggio", tone: "gold" },
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  META: "Meta Ads",
  GOOGLE: "Google Ads",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  ORGANICO: "Organico",
  EVENTO: "Evento",
  REFERRAL: "Referral",
  SITO: "Sito web",
};

// Migliaia sempre separate, anche sotto 10.000 (regola già usata nel CRM): 1.200 €, non 1200 €.
export const euro = (n: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0, useGrouping: "always" }).format(n);

export const dataBreve = (d: Date | string) =>
  new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", timeZone: "Europe/Rome" }).format(
    // "AAAA-MM-GG" si legge a mezzogiorno (niente slittamenti di fuso); date complete così come sono.
    typeof d === "string" ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d) : d,
  );

/** Per gli eventi alcuni stati hanno un nome più naturale (stessi valori nel database). */
export const EVENT_STATUS_UI: Record<WorkStatus, { label: string; tone: Tone }> = {
  ...WORK_STATUS_UI,
  PUBBLICATO: { label: "Confermato", tone: "ok" },
  PAUSA: { label: "Sospeso", tone: "warn" },
  CONCLUSO: { label: "Svolto", tone: "neutral" },
};
