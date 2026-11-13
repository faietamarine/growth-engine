import { z } from "zod";
import { MARCHIO_SLUGS } from "@/lib/brands/catalog";

/* Categorie, condizioni e regole degli annunci della vetrina pubblica. */

export const CATEGORIE = [
  { id: "GOMMONE", nome: "Gommoni" },
  { id: "OPEN", nome: "Open" },
  { id: "CABINATO", nome: "Cabinati" },
  { id: "MOTO_ACQUA", nome: "Moto d'acqua" },
  { id: "FUORIBORDO", nome: "Fuoribordo" },
] as const;
export type CategoriaId = (typeof CATEGORIE)[number]["id"];
export const CATEGORIA_IDS = CATEGORIE.map((c) => c.id) as [CategoriaId, ...CategoriaId[]];
export const nomeCategoria = (id: string) => CATEGORIE.find((c) => c.id === id)?.nome ?? id;

export const CONDIZIONI = [
  { id: "PRONTA_CONSEGNA", nome: "Pronta consegna", slug: "pronte-consegne", titolo: "Pronte consegne", sotto: "Disponibili subito, in piazzale a Pescara." },
  { id: "DA_ORDINARE", nome: "A catalogo", slug: "catalogo", titolo: "Modelli a catalogo", sotto: "Modelli nuovi che puoi configurare e ordinare." },
  { id: "USATO", nome: "Usato", slug: "usato", titolo: "Vetrina dell'usato", sotto: "Usato selezionato e controllato dai nostri tecnici." },
] as const;
/** Sezioni mostrate come tali sul sito: i modelli a catalogo vivono dentro la pagina di ogni marchio. */
export const SEZIONI_SITO = CONDIZIONI.filter((c) => c.id !== "DA_ORDINARE");
export type CondizioneId = (typeof CONDIZIONI)[number]["id"];
export const CONDIZIONE_IDS = CONDIZIONI.map((c) => c.id) as [CondizioneId, ...CondizioneId[]];
export const condizioneDaSlug = (slug?: string | null) => CONDIZIONI.find((c) => c.slug === slug || c.id === slug);

export const STATI_MEZZO = ["BOZZA", "PUBBLICATO", "VENDUTO"] as const;
export type StatoMezzo = (typeof STATI_MEZZO)[number];
export const STATO_UI: Record<StatoMezzo, string> = { BOZZA: "Bozza", PUBBLICATO: "Online", VENDUTO: "Venduto" };

export const MAX_FOTO = 12;

const numero = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : v), z.number().min(min).max(max).optional());

const elenco = z.preprocess(
  (v) =>
    typeof v === "string"
      ? v
          .split(/\r?\n/)
          .map((x) => x.trim())
          .filter(Boolean)
      : v,
  z.array(z.string().max(80)).max(30).default([]),
);

const listaFoto = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return [];
  }
}, z.array(z.string().uuid()).max(MAX_FOTO).default([]));

export const mezzoSchema = z.object({
  marca: z.enum(MARCHIO_SLUGS as [string, ...string[]], { errorMap: () => ({ message: "Scegli il marchio" }) }),
  modello: z.string().trim().min(1, "Scrivi il modello").max(80),
  categoria: z.enum(CATEGORIA_IDS, { errorMap: () => ({ message: "Scegli la categoria" }) }),
  condizione: z.enum(CONDIZIONE_IDS, { errorMap: () => ({ message: "Scegli dove mostrarlo" }) }),
  stato: z.enum(STATI_MEZZO).default("BOZZA"),
  anno: numero(1950, 2100),
  prezzo: numero(0, 50_000_000),
  lunghezza: numero(1, 200),
  motore: z.string().trim().max(120).default(""),
  ore: numero(0, 100_000),
  posti: numero(1, 200),
  descrizione: z.string().trim().max(4000).default(""),
  dotazioni: elenco,
  foto: listaFoto,
  inEvidenza: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});
export type MezzoInput = z.infer<typeof mezzoSchema>;

/** Regole di coerenza: l'usato ha l'anno; nulla va online senza almeno una foto (tranne i modelli a catalogo). */
export function controllaMezzo(d: MezzoInput): string | null {
  if (d.condizione === "USATO" && !d.anno) return "Per l'usato indica l'anno.";
  if (d.stato === "PUBBLICATO" && d.condizione !== "DA_ORDINARE" && d.foto.length === 0) return "Per pubblicare serve almeno una foto.";
  return null;
}

export const euro = (n?: number | null) => (n == null ? "Su richiesta" : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n));
export const metri = (n?: number | null) => (n == null ? "" : `${String(n).replace(".", ",")} m`);

/** Righe "dati vitali" mostrate sulla scheda e sulle card. */
export function datiVitali(m: { anno?: number | null; lunghezza?: number | null; motore?: string; ore?: number | null; posti?: number | null }) {
  return [
    m.anno ? { k: "Anno", v: String(m.anno) } : null,
    m.lunghezza ? { k: "Lunghezza", v: metri(m.lunghezza) } : null,
    m.motore ? { k: "Motore", v: m.motore } : null,
    m.ore != null ? { k: "Ore motore", v: String(m.ore) } : null,
    m.posti ? { k: "Persone", v: String(m.posti) } : null,
  ].filter((x): x is { k: string; v: string } => !!x);
}
