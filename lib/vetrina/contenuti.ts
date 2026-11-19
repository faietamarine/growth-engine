import { z } from "zod";

/* Blog ed eventi del sito pubblico: regole e formati condivisi tra app, sito e test (nessun accesso al database qui). */

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");
const foto = z.preprocess((v) => {
  if (typeof v !== "string" || !v.startsWith("[")) return v ?? "";
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? (a[0] ?? "") : "";
  } catch {
    return "";
  }
}, z.union([z.literal(""), z.string().uuid()]));

export const postSchema = z.object({
  titolo: z.string().trim().min(5, "Scrivi un titolo di almeno 5 caratteri").max(120),
  sommario: z.string().trim().max(280).default(""),
  testo: z.string().trim().max(20000).default(""),
  foto: foto.default(""),
  stato: z.enum(["BOZZA", "PUBBLICATO"]).default("BOZZA"),
  pubblicatoIl: z.union([z.literal(""), data]).default(""),
});
export type PostInput = z.infer<typeof postSchema>;

export const TIPI_EVENTO = [
  { id: "PROVE_IN_MARE", nome: "Prove in mare" },
  { id: "EVENTO", nome: "Evento" },
] as const;

export const eventoSchema = z
  .object({
    tipo: z.enum(["PROVE_IN_MARE", "EVENTO"]),
    titolo: z.string().trim().min(5, "Scrivi un titolo di almeno 5 caratteri").max(120),
    data,
    dataFine: z.union([z.literal(""), data]).default(""),
    orario: z.string().trim().max(40).default(""),
    luogo: z.string().trim().max(160).default(""),
    descrizione: z.string().trim().max(6000).default(""),
    mezzi: z.string().trim().max(2000).default(""),
    foto: foto.default(""),
    posti: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1, "Posti: almeno 1").max(2000).nullable()).default(null),
    stato: z.enum(["BOZZA", "PUBBLICATO"]).default("BOZZA"),
  })
  .refine((e) => !e.dataFine || e.dataFine >= e.data, { message: "La data di fine viene prima dell'inizio", path: ["dataFine"] });
export type EventoInput = z.infer<typeof eventoSchema>;

/** Un articolo è pronto per il sito solo con testo sufficiente: meglio nessun articolo che uno vuoto. */
export function controllaPost(p: PostInput) {
  if (p.stato === "PUBBLICATO" && p.testo.length < 300) return "Per pubblicare servono almeno 300 caratteri di testo (circa 5 righe).";
  return null;
}

export type Blocco = { tipo: "titolo" | "paragrafo" | "elenco"; righe: string[] };

/** Testo semplice → blocchi: riga vuota separa i paragrafi, "## " è un sottotitolo, righe con "- " sono un elenco. */
export function blocchi(testo: string): Blocco[] {
  return testo
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap<Blocco>((p) => {
      if (p.startsWith("## ")) {
        const [t, ...resto] = p.split("\n");
        const testa: Blocco = { tipo: "titolo", righe: [t.slice(3).trim()] };
        return resto.length ? [testa, ...blocchi(resto.join("\n"))] : [testa];
      }
      const righe = p.split("\n").map((r) => r.trim());
      if (righe.every((r) => /^[-•]\s+/.test(r))) return [{ tipo: "elenco", righe: righe.map((r) => r.replace(/^[-•]\s+/, "")) }];
      return [{ tipo: "paragrafo", righe }];
    });
}

/** Testo semplice per anteprime e meta description. */
export function estratto(testo: string, max = 160) {
  const pulito = testo.replace(/^##\s+/gm, "").replace(/^[-•]\s+/gm, "").replace(/\s+/g, " ").trim();
  return pulito.length <= max ? pulito : `${pulito.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** Minuti di lettura (200 parole al minuto, minimo 1). */
export const minutiLettura = (testo: string) => Math.max(1, Math.round(testo.split(/\s+/).filter(Boolean).length / 200));

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const MESI_BREVI = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"];

export function dataLunga(d: string) {
  const [a, m, g] = d.split("-").map(Number);
  return `${g} ${MESI[m - 1]} ${a}`;
}
export function giornoMese(d: string) {
  const [, m, g] = d.split("-").map(Number);
  return { giorno: String(g), mese: MESI_BREVI[m - 1] };
}

/** "14 – 15 marzo 2027", "28 febbraio – 2 marzo 2027" oppure la data singola. */
export function periodo(inizio: string, fine?: string | null) {
  if (!fine || fine === inizio) return dataLunga(inizio);
  const [a1, m1, g1] = inizio.split("-").map(Number);
  const [a2, m2] = fine.split("-").map(Number);
  if (a1 === a2 && m1 === m2) return `${g1} – ${dataLunga(fine)}`;
  if (a1 === a2) return `${g1} ${MESI[m1 - 1]} – ${dataLunga(fine)}`;
  return `${dataLunga(inizio)} – ${dataLunga(fine)}`;
}

/** Un evento resta in elenco fino all'ultimo giorno compreso. */
export const eventoFuturo = (e: { data: string; dataFine?: string | null }, oggi: string) => (e.dataFine || e.data) >= oggi;

export const righeMezzi = (s: string) => s.split("\n").map((r) => r.trim()).filter(Boolean);

/* Reparti dell'assistenza: ognuno può avere una foto illustrativa caricata dall'app. */
export const REPARTI_SERVIZI = [
  { id: "officina", titolo: "Officina fuoribordo e moto d'acqua", testo: "Tagliandi, diagnosi e riparazioni su fuoribordo e moto d'acqua, con ricambi e personale tecnico in sede." },
  { id: "manutenzione", titolo: "Manutenzione e preparazione", testo: "Messa a punto di inizio stagione, controlli prima del varo, lavaggio e sanificazione dei circuiti." },
  { id: "rimessaggio", titolo: "Rimessaggio e invernaggio", testo: "Custodia del mezzo nei mesi invernali e preparazione al fermo, per ritrovarlo pronto in primavera." },
  { id: "consegna", titolo: "Consegna del nuovo", testo: "Allestimento e consegna del mezzo acquistato, con prova e spiegazione a bordo." },
] as const;

export const HERO_DEFAULT = {
  titolo: "Faieta Marine.",
  frase: "Tutto per il tuo mare: vendita, assistenza e rimessaggio a Pescara.",
  sotto: "Barche, gommoni, moto d'acqua e motori: pronte consegne, modelli da ordinare e usato selezionato. Vieni a trovarci e prenota la tua visita.",
};
