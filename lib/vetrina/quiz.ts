import type { CategoriaId, CondizioneId } from "./catalog";

/* Quiz "Trova la tua barca": 3 domande → categorie adatte e urgenza.
   Le risposte pesano sul punteggio del lead tramite la tempistica (vedi lib/leads/score.ts). */

type Opzione = { v: string; cat?: CategoriaId[]; cond?: CondizioneId[]; tempistica?: string };
export const DOMANDE: { id: "uso" | "persone" | "quando"; titolo: string; opzioni: Opzione[] }[] = [
  {
    id: "uso",
    titolo: "Come vuoi usare la barca?",
    opzioni: [
      { v: "Diporto nel weekend", cat: ["OPEN", "GOMMONE"] },
      { v: "Pesca", cat: ["CABINATO", "OPEN"] },
      { v: "Crociera", cat: ["VELA", "CABINATO"] },
      { v: "Sport e velocità", cat: ["MOTO_ACQUA", "GOMMONE", "OPEN"] },
    ],
  },
  {
    id: "persone",
    titolo: "Quante persone salgono di solito?",
    opzioni: [
      { v: "Solo io o in due", cat: ["MOTO_ACQUA", "GOMMONE", "OPEN"] },
      { v: "Da tre a cinque", cat: ["OPEN", "GOMMONE", "CABINATO"] },
      { v: "Più di cinque", cat: ["CABINATO", "VELA", "GOMMONE"] },
    ],
  },
  {
    id: "quando",
    titolo: "Quando vorresti averla?",
    opzioni: [
      { v: "Subito, pronta consegna", tempistica: "Entro 3 mesi", cond: ["PRONTA_CONSEGNA", "USATO"] },
      { v: "Entro la prossima stagione", tempistica: "Entro 6 mesi", cond: ["DA_ORDINARE", "PRONTA_CONSEGNA"] },
      { v: "Sto solo guardando", tempistica: "Sto solo guardando", cond: ["DA_ORDINARE", "PRONTA_CONSEGNA", "USATO"] },
    ],
  },
];

export type Risposte = { uso?: string; persone?: string; quando?: string };

export function profiloQuiz(r: Risposte): { categorie: CategoriaId[]; condizioni: CondizioneId[]; tempistica: string } {
  const peso = new Map<CategoriaId, number>();
  for (const d of DOMANDE.slice(0, 2)) {
    const scelta = d.opzioni.find((o) => o.v === r[d.id as "uso" | "persone"]);
    scelta?.cat?.forEach((c, i) => peso.set(c, (peso.get(c) ?? 0) + (3 - i)));
  }
  const categorie = [...peso.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const q = DOMANDE[2].opzioni.find((o) => o.v === r.quando);
  return { categorie, condizioni: q?.cond ?? [], tempistica: q?.tempistica ?? "" };
}

/** Ordina i mezzi per vicinanza al profilo: categoria desiderata, poi condizione, poi in evidenza. */
export function ordinaPerProfilo<T extends { categoria: string; condizione: string; inEvidenza: boolean }>(mezzi: T[], p: ReturnType<typeof profiloQuiz>): T[] {
  const punti = (m: T) => {
    const c = p.categorie.indexOf(m.categoria as CategoriaId);
    const k = p.condizioni.indexOf(m.condizione as CondizioneId);
    return (c >= 0 ? 100 - c * 10 : 0) + (k >= 0 ? 30 - k * 5 : 0) + (m.inEvidenza ? 3 : 0);
  };
  return [...mezzi].sort((a, b) => punti(b) - punti(a));
}
