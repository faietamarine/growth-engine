/* Valori ammessi condivisi tra server e browser (senza dipendenze dal database). */

export const ROLES = ["ADMIN", "MARKETING", "CONTENT", "EVENT"] as const;
export type Role = (typeof ROLES)[number];

/** Stati condivisi da campagne, funnel, landing e lead magnet. */
export const WORK_STATUS = ["BOZZA", "REVISIONE", "APPROVATO", "PUBBLICATO", "PAUSA", "CONCLUSO"] as const;
export type WorkStatus = (typeof WORK_STATUS)[number];

/** Stati degli asset creativi (richiesta: idea → pubblicato). */
export const ASSET_STATUS = ["IDEA", "BOZZA", "REVISIONE", "APPROVATO", "PUBBLICATO"] as const;
export type AssetStatus = (typeof ASSET_STATUS)[number];

export const TASK_STATUS = ["DA_FARE", "IN_CORSO", "IN_REVISIONE", "FATTO"] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

/**
 * Reparto di destinazione in Nautilus EVO: decide in quale elenco del CRM finisce il lead.
 * VENDITA → "Lead" (lead-list), SERVICE → "Lead Service" (lead-service-list).
 * NOLEGGIO → per ora "Lead" con interesse "Noleggio", perché il CRM non ha una pipeline lead noleggio.
 */
export const REPARTI = ["VENDITA", "SERVICE", "NOLEGGIO"] as const;
export type Reparto = (typeof REPARTI)[number];

export const CHANNELS = ["META", "GOOGLE", "EMAIL", "WHATSAPP", "ORGANICO", "EVENTO", "REFERRAL", "SITO"] as const;
export type Channel = (typeof CHANNELS)[number];

/** Stato del lead dentro il Growth Engine (prima della consegna al CRM). */
export const LEAD_STATUS = ["NUOVO", "QUALIFICATO", "NON_QUALIFICATO", "CONSEGNATO", "SCARTATO"] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

export const FUNNEL_STEP_TIPI = ["LANDING", "FORM", "QUIZ", "CALCOLATORE", "GRAZIE", "EMAIL", "WHATSAPP"] as const;
