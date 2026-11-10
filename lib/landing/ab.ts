/* Test A/B delle landing: applicazione della variante e lettura dei risultati. */

import type { AbTest, Blocco } from "@/types/landing";

/** Cookie con la variante assegnata al visitatore (A o B). */
export const AB_COOKIE = "ng_ab";

export const ELEMENTI_AB: { valore: AbTest["elemento"]; nome: string; aiuto: string }[] = [
  { valore: "headline", nome: "Titolo", aiuto: "Il titolo grande dell'apertura" },
  { valore: "cta", nome: "Pulsante", aiuto: "Il testo dei pulsanti" },
  { valore: "immagine", nome: "Immagine", aiuto: "L'immagine dell'apertura (indirizzo https)" },
  { valore: "offerta", nome: "Offerta", aiuto: "Il sottotitolo dell'apertura" },
];

/** Restituisce i blocchi come li vede chi capita nella variante indicata. */
export function applicaVariante(blocchi: Blocco[], ab: AbTest | null | undefined, variante: "A" | "B"): Blocco[] {
  if (!ab?.attivo || variante === "A" || !ab.valoreB.trim()) return blocchi;
  const v = ab.valoreB.trim();
  return blocchi.map((b) => {
    if (b.tipo === "hero") {
      if (ab.elemento === "headline") return { ...b, headline: v };
      if (ab.elemento === "immagine") return { ...b, immagine: v };
      if (ab.elemento === "offerta") return { ...b, sottotitolo: v };
      if (ab.elemento === "cta") return { ...b, cta: v };
    }
    if (ab.elemento === "cta" && (b.tipo === "form" || b.tipo === "cta")) return { ...b, cta: v };
    return b;
  });
}

/** Variante per un nuovo visitatore: 50/50. `r` è un numero casuale tra 0 e 1. */
export function scegliVariante(r: number): "A" | "B" {
  return r < 0.5 ? "A" : "B";
}

export type RisultatoAb = {
  tassoA: number;
  tassoB: number;
  differenza: number; // punti percentuali (B − A)
  z: number;
  vincitore: "A" | "B" | null;
  messaggio: string;
};

const MIN_VISITE = 100;

/**
 * Confronto tra due tassi di conversione (test z su due proporzioni, confidenza 95%: |z| ≥ 1,96).
 * Sotto le 100 visite per variante non si dichiara nessun vincitore.
 */
export function confrontaVarianti(visiteA: number, leadA: number, visiteB: number, leadB: number): RisultatoAb {
  const tassoA = visiteA > 0 ? leadA / visiteA : 0;
  const tassoB = visiteB > 0 ? leadB / visiteB : 0;
  const differenza = (tassoB - tassoA) * 100;
  const base = { tassoA, tassoB, differenza };
  if (visiteA < MIN_VISITE || visiteB < MIN_VISITE) {
    const mancano = Math.max(MIN_VISITE - visiteA, MIN_VISITE - visiteB);
    return { ...base, z: 0, vincitore: null, messaggio: `Dati ancora pochi: servono almeno ${MIN_VISITE} visite per variante (ne mancano circa ${mancano}).` };
  }
  const p = (leadA + leadB) / (visiteA + visiteB);
  const se = Math.sqrt(p * (1 - p) * (1 / visiteA + 1 / visiteB));
  const z = se > 0 ? (tassoB - tassoA) / se : 0;
  if (Math.abs(z) < 1.96) return { ...base, z, vincitore: null, messaggio: "Nessuna differenza sicura tra le due varianti: lascia correre il test." };
  const vincitore = z > 0 ? "B" : "A";
  return { ...base, z, vincitore, messaggio: `La variante ${vincitore} converte meglio con una confidenza del 95%: puoi applicarla e chiudere il test.` };
}
