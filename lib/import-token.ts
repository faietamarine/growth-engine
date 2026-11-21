import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Ingresso per il caricamento automatico (foto e testi dei mezzi) fatto da Claude.
 * Funziona solo se su Netlify c'è la variabile segreta IMPORT_TOKEN (almeno 32 caratteri):
 * togliendola, l'ingresso si spegne. Nessuna sessione utente: solo la chiave nell'intestazione.
 */
export function importAutorizzato(req: Request) {
  const atteso = process.env.IMPORT_TOKEN ?? "";
  if (atteso.length < 32) return false;
  const dato = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(dato);
  const b = Buffer.from(atteso);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const UTENTE_IMPORT = { id: null as unknown as string, name: "Caricamento automatico (Claude)" };
