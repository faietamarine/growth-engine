import { z } from "zod";

/*
 * Finanziamento. Sul sito NON si mostrano rate o tassi: il mezzo nautico si finanzia solo in sede, quindi il sito
 * raccoglie le preferenze del cliente (acconto, rata, durata) e il venditore richiama con una proposta su misura.
 * Il calcolo qui sotto serve al calcolatore interno dell'app (telefonata, banco in sede).
 * Riferimenti per qualsiasi pubblicità con cifre:
 * Pubblicità del credito ai consumatori (art. 123 TUB e disposizioni CICR in vigore dal 20/11/2026):
 * se si mostra una rata o un tasso servono, con un esempio rappresentativo, tasso (fisso), importo totale del credito,
 * TAEG, durata, prezzo in contanti e anticipo, importo totale dovuto e rata, i contatti del finanziatore, l'avviso
 * "Attenzione! Prendere in prestito denaro costa denaro" e nessuna voce può essere più evidente del TAEG.
 */

export type ImpostazioniFinanziamento = {
  attivo: boolean;
  finanziaria: string; // ragione sociale del finanziatore
  contatti: string; // telefono o sito del finanziatore
  tan: number; // % annuo, fisso
  speseIstruttoria: number; // € una tantum
  speseIncasso: number; // € per rata
  impostaBollo: number; // € (bollo o imposta sostitutiva)
  durate: number[]; // mesi proposti
  durataPredefinita: number;
  anticipoMinimo: number; // % del prezzo
  anticipoPredefinito: number; // % del prezzo
  importoMinimo: number; // € di credito
  validoFino: string; // AAAA-MM-GG, vuoto = senza scadenza
};

export const FINANZIAMENTO_VUOTO: ImpostazioniFinanziamento = {
  attivo: false,
  finanziaria: "",
  contatti: "",
  tan: 0,
  speseIstruttoria: 0,
  speseIncasso: 0,
  impostaBollo: 16,
  durate: [24, 36, 48, 60, 72, 84],
  durataPredefinita: 60,
  anticipoMinimo: 10,
  anticipoPredefinito: 20,
  importoMinimo: 3000,
  validoFino: "",
};

const num = (min: number, max: number) => z.preprocess((v) => (v === "" || v == null ? 0 : Number(String(v).replace(",", "."))), z.number().min(min).max(max));

export const finanziamentoSchema = z
  .object({
    attivo: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
    finanziaria: z.string().trim().max(120).default(""),
    contatti: z.string().trim().max(160).default(""),
    tan: num(0, 30),
    speseIstruttoria: num(0, 5000),
    speseIncasso: num(0, 50),
    impostaBollo: num(0, 1000),
    durate: z.preprocess(
      (v) =>
        String(v ?? "")
          .split(/[^\d]+/)
          .filter(Boolean)
          .map(Number),
      z.array(z.number().int().min(6).max(180)).min(1, "Indica almeno una durata in mesi"),
    ),
    durataPredefinita: z.preprocess((v) => Number(v), z.number().int().min(6).max(180)),
    anticipoMinimo: num(0, 90),
    anticipoPredefinito: num(0, 90),
    importoMinimo: num(0, 1_000_000),
    validoFino: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).default(""),
  })
  .superRefine((f, ctx) => {
    if (f.attivo && (!f.finanziaria || !f.contatti)) ctx.addIssue({ code: "custom", message: "Per proporlo sul sito servono il nome della finanziaria e un suo contatto (lo chiede la legge sulla pubblicità del credito)." });
    if (f.anticipoPredefinito < f.anticipoMinimo) ctx.addIssue({ code: "custom", message: "L'anticipo proposto non può essere sotto il minimo." });
  })
  .transform((f) => ({ ...f, durate: [...new Set(f.durate)].sort((a, b) => a - b), durataPredefinita: f.durate.includes(f.durataPredefinita) ? f.durataPredefinita : f.durate[f.durate.length - 1] }));

export type Esempio = {
  prezzo: number;
  anticipo: number;
  credito: number; // importo totale del credito
  mesi: number;
  rata: number; // rata comprensiva delle spese di incasso
  tan: number;
  taeg: number;
  totaleDovuto: number; // rate + spese una tantum
  costoCredito: number; // totale dovuto - credito
};

const arrot = (n: number) => Math.round(n * 100) / 100;

/**
 * Rata a tasso fisso (ammortamento francese) e TAEG con la formula europea:
 * credito = somma dei pagamenti attualizzati con (1 + TAEG)^(-t), t in anni, spese iniziali tolte dal credito erogato.
 */
export function esempioFinanziamento(prezzo: number, anticipoPerc: number, mesi: number, f: Pick<ImpostazioniFinanziamento, "tan" | "speseIstruttoria" | "speseIncasso" | "impostaBollo">): Esempio | null {
  const anticipo = Math.round((prezzo * anticipoPerc) / 100);
  const credito = prezzo - anticipo;
  if (credito <= 0 || mesi <= 0) return null;
  const i = f.tan / 100 / 12;
  const quota = i === 0 ? credito / mesi : (credito * i) / (1 - Math.pow(1 + i, -mesi));
  const rata = arrot(quota + f.speseIncasso);
  const iniziali = f.speseIstruttoria + f.impostaBollo;
  const totaleDovuto = arrot(rata * mesi + iniziali);
  // Il cliente riceve il credito meno le spese iniziali e restituisce le rate.
  const netto = credito - iniziali;
  const valore = (x: number) => {
    let s = 0;
    for (let k = 1; k <= mesi; k++) s += rata / Math.pow(1 + x, k / 12);
    return s - netto;
  };
  let lo = 0;
  let hi = 2;
  for (let n = 0; n < 200; n++) {
    const mid = (lo + hi) / 2;
    if (valore(mid) > 0) lo = mid;
    else hi = mid;
  }
  const taeg = Math.round(((lo + hi) / 2) * 10000) / 100;
  return { prezzo, anticipo, credito, mesi, rata, tan: f.tan, taeg, totaleDovuto, costoCredito: arrot(totaleDovuto - credito) };
}

/** Il riquadro "Vuoi finanziarlo?" compare se attivo, non scaduto e (con prezzo noto) sopra l'importo minimo. */
export function finanziamentoMostrabile(f: ImpostazioniFinanziamento, prezzo: number | null, oggi: string) {
  if (!f.attivo || !f.finanziaria || !f.contatti) return false;
  if (f.validoFino && f.validoFino < oggi) return false;
  return prezzo == null || prezzo * (1 - f.anticipoMinimo / 100) >= f.importoMinimo;
}

/** Domande sul sito (a pulsanti, facoltative): nessun dato su reddito o lavoro, quelli li raccoglie la finanziaria in sede. */
export const DOMANDE_FINANZIAMENTO = {
  pagamento: ["Unica soluzione", "Finanziamento", "Non so ancora"],
  acconto: ["Nessuno", "Circa 10-20%", "30% o più", "Ho una permuta"],
  rata: ["Fino a 300 €", "300-600 €", "600-1.000 €", "Oltre 1.000 €"],
  durata: ["36 mesi", "60 mesi", "84 mesi", "Consigliatemi voi"],
} as const;
