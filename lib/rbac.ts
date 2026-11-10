import type { Role } from "@/db/schema";

/** Azioni controllate dai permessi. Aggiungerne una nuova = aggiungerla qui e nella tabella. */
export type Action =
  | "campagne:scrivi"
  | "campagne:approva"
  | "funnel:scrivi"
  | "contenuti:scrivi"
  | "landing:pubblica"
  | "eventi:scrivi"
  | "lead:vedi"
  | "lead:consegna"
  | "impostazioni:gestisci"
  | "utenti:gestisci"
  | "audit:vedi";

const PERMESSI: Record<Role, readonly Action[]> = {
  ADMIN: [
    "campagne:scrivi",
    "campagne:approva",
    "funnel:scrivi",
    "contenuti:scrivi",
    "landing:pubblica",
    "eventi:scrivi",
    "lead:vedi",
    "lead:consegna",
    "impostazioni:gestisci",
    "utenti:gestisci",
    "audit:vedi",
  ],
  MARKETING: ["campagne:scrivi", "campagne:approva", "funnel:scrivi", "contenuti:scrivi", "landing:pubblica", "eventi:scrivi", "lead:vedi", "lead:consegna"],
  CONTENT: ["contenuti:scrivi", "funnel:scrivi"],
  EVENT: ["eventi:scrivi", "lead:vedi"],
};

export function can(role: Role, action: Action): boolean {
  return PERMESSI[role].includes(action);
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  MARKETING: "Marketing",
  CONTENT: "Content Creator",
  EVENT: "Event Manager",
};
