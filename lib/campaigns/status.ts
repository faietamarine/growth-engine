import type { WorkStatus, Role } from "@/db/schema";
import { can, type Action } from "@/lib/rbac";

/** Passaggi di stato ammessi per una campagna e permesso richiesto per ciascuno. */
export type Transition = { to: WorkStatus; label: string; perm: Action; primaria?: boolean; conferma?: string; from?: WorkStatus };

export const TRANSITIONS: Record<WorkStatus, Transition[]> = {
  BOZZA: [{ to: "REVISIONE", label: "Invia in revisione", perm: "campagne:scrivi", primaria: true }],
  REVISIONE: [
    { to: "APPROVATO", label: "Approva", perm: "campagne:approva", primaria: true },
    { to: "BOZZA", label: "Rimanda in bozza", perm: "campagne:scrivi" },
  ],
  APPROVATO: [
    { to: "PUBBLICATO", label: "Avvia la campagna", perm: "campagne:approva", primaria: true, conferma: "Avviare la campagna? Da ora i lead raccolti verranno attribuiti a questa campagna." },
    { to: "BOZZA", label: "Riapri in bozza", perm: "campagne:scrivi" },
  ],
  PUBBLICATO: [
    { to: "PAUSA", label: "Metti in pausa", perm: "campagne:approva" },
    { to: "CONCLUSO", label: "Concludi", perm: "campagne:approva", conferma: "Concludere la campagna? Non sarà più modificabile, tranne la spesa sostenuta." },
  ],
  PAUSA: [
    { to: "PUBBLICATO", label: "Riprendi", perm: "campagne:approva", primaria: true },
    { to: "CONCLUSO", label: "Concludi", perm: "campagne:approva", conferma: "Concludere la campagna? Non sarà più modificabile, tranne la spesa sostenuta." },
  ],
  CONCLUSO: [],
};

/** Campagne e funnel seguono lo stesso percorso; per i funnel "scrivere" richiede funnel:scrivi. */
export type Oggetto = "campagna" | "funnel" | "contenuto" | "landing" | "evento";

/** Eventi: chi organizza (eventi:scrivi) prepara, conferma e chiude; l'approvazione resta a marketing/direzione. */
const EVENTO: Partial<Record<WorkStatus, Partial<Record<WorkStatus, Partial<Transition>>>>> = {
  BOZZA: { REVISIONE: { perm: "eventi:scrivi" } },
  REVISIONE: { BOZZA: { perm: "eventi:scrivi" } },
  APPROVATO: {
    PUBBLICATO: { perm: "eventi:scrivi", label: "Conferma l'evento", conferma: "Confermare l'evento? Da ora compare nel calendario come confermato e si possono raccogliere iscrizioni." },
    BOZZA: { perm: "eventi:scrivi" },
  },
  PUBBLICATO: {
    PAUSA: { perm: "eventi:scrivi", label: "Sospendi" },
    CONCLUSO: { perm: "eventi:scrivi", label: "Segna come svolto", conferma: "Segnare l'evento come svolto? La pagina di iscrizione verrà chiusa; check-in e spesa restano modificabili." },
  },
  PAUSA: {
    PUBBLICATO: { perm: "eventi:scrivi", label: "Riprendi" },
    CONCLUSO: { perm: "eventi:scrivi", label: "Segna come svolto", conferma: "Segnare l'evento come svolto? La pagina di iscrizione verrà chiusa; check-in e spesa restano modificabili." },
  },
};

function perOggetto(t: Transition, o: Oggetto): Transition {
  if (o === "evento") return { ...t, ...((t.from && EVENTO[t.from]?.[t.to]) || {}) };
  if (o === "landing") {
    if (t.perm === "campagne:scrivi") return { ...t, perm: "contenuti:scrivi" };
    if (t.to === "PUBBLICATO") return { ...t, perm: "landing:pubblica", label: t.label === "Riprendi" ? "Rimetti online" : "Pubblica online", conferma: t.label === "Riprendi" ? undefined : "Pubblicare la pagina? Sarà raggiungibile da chiunque abbia il link." };
    if (t.to === "PAUSA") return { ...t, perm: "landing:pubblica", label: "Metti offline", conferma: "Mettere offline la pagina? Chi apre il link vedrà «pagina non disponibile»." };
    if (t.to === "CONCLUSO") return { ...t, perm: "landing:pubblica", conferma: "Concludere la pagina? Andrà offline e resterà solo come storico." };
    return t;
  }
  if (o === "contenuto") {
    if (t.perm === "campagne:scrivi") return { ...t, perm: "contenuti:scrivi" };
    if (t.to === "PUBBLICATO" && t.conferma) return { ...t, label: "Pubblica", conferma: "Pubblicare il lead magnet? Da ora non sarà più modificabile: per cambiarlo dovrai duplicarlo." };
    if (t.to === "CONCLUSO") return { ...t, conferma: "Concludere il lead magnet? Resterà consultabile ma non più modificabile." };
    return t;
  }
  if (o === "funnel" && t.perm === "campagne:scrivi") return { ...t, perm: "funnel:scrivi" };
  if (o === "funnel" && t.to === "PUBBLICATO" && t.conferma) return { ...t, label: "Pubblica", conferma: "Pubblicare il funnel? Da ora non sarà più modificabile: per cambiarlo dovrai duplicarlo." };
  if (o === "funnel" && t.to === "CONCLUSO") return { ...t, conferma: "Concludere il funnel? Resterà consultabile ma non più modificabile." };
  return t;
}

export function allowedTransitions(from: WorkStatus, role: Role, o: Oggetto = "campagna"): Transition[] {
  return TRANSITIONS[from].map((t) => perOggetto({ ...t, from }, o)).filter((t) => can(role, t.perm));
}

export function canTransition(from: WorkStatus, to: WorkStatus, role: Role, o: Oggetto = "campagna"): boolean {
  return allowedTransitions(from, role, o).some((t) => t.to === to);
}

/** Un funnel si modifica finché non è pubblicato: dopo si duplica (così le statistiche restano legate a una versione). */
export function funnelEditable(status: WorkStatus) {
  return status === "BOZZA" || status === "REVISIONE" || status === "APPROVATO";
}

/**
 * Cosa si può modificare in ogni stato:
 *  - "tutto": strategia, testi, budget, date
 *  - "operativo": solo spesa, fine campagna e obiettivo lead (campagna già in corso)
 *  - "spesa": solo la spesa sostenuta (campagna conclusa)
 * Modificare la strategia di una campagna APPROVATA la riporta in REVISIONE.
 */
export type EditScope = "tutto" | "operativo" | "spesa";
export function editScope(status: WorkStatus): EditScope {
  if (status === "PUBBLICATO" || status === "PAUSA") return "operativo";
  if (status === "CONCLUSO") return "spesa";
  return "tutto";
}
