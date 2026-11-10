import type { Reparto } from "@/db/schema";

/**
 * Punteggio di qualificazione del lead (0–100). Regole volutamente semplici e leggibili:
 * il team deve poter capire perché un lead è "qualificato" senza aprire il codice.
 *
 *  Vendita / Noleggio                     Service
 *  - email presente            +10         +10
 *  - interesse indicato        +15         +35 (mezzo e richiesta)
 *  - budget indicato (> 0)     +20          —
 *  - tempistica                0–30        0–30
 *  - zona di navigazione        +5          +5
 *  - messaggio ≥ 20 caratteri  +10         +10
 *  - consenso marketing        +10         +10
 *  - presente a un evento      +25         +25 (incontrato di persona: check-in o raccolto sul posto)
 *  Massimo (tetto)             100         100
 */
export type ScoreInput = {
  reparto: Reparto;
  email?: string;
  interesse?: string;
  budget?: number | null;
  tempistica?: string;
  zona?: string;
  messaggio?: string;
  consensoMarketing?: boolean;
  /** Il cliente si è presentato a un evento (check-in) o è stato registrato di persona dallo staff. */
  presenteEvento?: boolean;
};

const PUNTI_TEMPI: Record<string, number> = {
  "Entro 3 mesi": 30,
  "Entro 6 mesi": 20,
  "Entro 12 mesi": 10,
  "Sto solo guardando": 0,
  Urgente: 30,
  "Entro il mese": 20,
  "Prossima stagione": 10,
};

export type ScoreDetail = { punti: number; voce: string }[];

export function scoreLead(i: ScoreInput): { score: number; dettaglio: ScoreDetail } {
  const d: ScoreDetail = [];
  const add = (cond: boolean, punti: number, voce: string) => {
    if (cond && punti > 0) d.push({ punti, voce });
  };
  const service = i.reparto === "SERVICE";
  add(!!i.email?.trim(), 10, "Email presente");
  add((i.interesse?.trim().length ?? 0) >= 3, service ? 35 : 15, service ? "Mezzo e richiesta indicati" : "Interesse indicato");
  add(!service && (i.budget ?? 0) > 0, 20, "Budget indicato");
  add(true, PUNTI_TEMPI[i.tempistica ?? ""] ?? 0, `Tempistica: ${i.tempistica || "non indicata"}`);
  add(!!i.zona?.trim(), 5, "Zona di navigazione");
  add((i.messaggio?.trim().length ?? 0) >= 20, 10, "Messaggio dettagliato");
  add(!!i.consensoMarketing, 10, "Consenso marketing");
  add(!!i.presenteEvento, 25, "Presente all'evento");
  const score = Math.min(100, d.reduce((s, x) => s + x.punti, 0));
  return { score, dettaglio: d };
}

export function isQualified(score: number, minScore: number) {
  return score >= minScore;
}

export function scoreBand(score: number): "caldo" | "tiepido" | "freddo" {
  return score >= 70 ? "caldo" : score >= 40 ? "tiepido" : "freddo";
}

/** Ricalcola il punteggio di un lead già salvato (es. dopo il check-in a un evento). */
export function scoreDaLead(l: { reparto: Reparto; email: string; interest: string; budget: number | null; timeframe: string; zone: string; message: string; consents: { marketing: boolean } }, presenteEvento: boolean) {
  return scoreLead({ reparto: l.reparto, email: l.email, interesse: l.interest, budget: l.budget, tempistica: l.timeframe, zona: l.zone, messaggio: l.message, consensoMarketing: l.consents.marketing, presenteEvento }).score;
}
