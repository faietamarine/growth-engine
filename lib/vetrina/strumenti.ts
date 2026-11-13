import { CATEGORIE, CONDIZIONI } from "./catalog";
import { MARCHI } from "@/lib/brands/catalog";

/* ---------- Prezzi di gruppo ---------- */
export type Variazione = { tipo: "PERCENTUALE" | "IMPORTO"; valore: number };

/** Nuovo prezzo dopo una variazione, arrotondato ai 10 €. Mai sotto zero. */
export function nuovoPrezzo(prezzo: number, v: Variazione): number {
  const grezzo = v.tipo === "PERCENTUALE" ? prezzo * (1 + v.valore / 100) : prezzo + v.valore;
  return Math.max(0, Math.round(grezzo / 10) * 10);
}

/* ---------- Importazione da CSV (Excel "Salva come CSV") ---------- */
export const COLONNE_CSV = ["marca", "modello", "categoria", "condizione", "anno", "prezzo", "lunghezza", "motore", "ore", "posti", "descrizione"] as const;
export const MODELLO_CSV = `${COLONNE_CSV.join(";")}\nCapelli;Tempest 600;Gommone;Pronta consegna;2025;48500;6;Yamaha F150;0;10;Con tendalino\n`;

/** Legge un CSV con separatore ; o , e campi tra virgolette. Ignora le righe vuote. */
export function leggiCsv(testo: string): string[][] {
  const t = testo.replace(/^﻿/, "");
  const sep = (t.split("\n")[0].match(/;/g)?.length ?? 0) >= (t.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const righe: string[][] = [];
  let riga: string[] = [];
  let campo = "";
  let virgolette = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (virgolette) {
      if (c === '"' && t[i + 1] === '"') (campo += '"'), i++;
      else if (c === '"') virgolette = false;
      else campo += c;
    } else if (c === '"') virgolette = true;
    else if (c === sep) (riga.push(campo), (campo = ""));
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      riga.push(campo);
      campo = "";
      if (riga.some((x) => x.trim())) righe.push(riga);
      riga = [];
    } else campo += c;
  }
  riga.push(campo);
  if (riga.some((x) => x.trim())) righe.push(riga);
  return righe;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function slug(s: string) {
  return norm(s).replace(/ /g, "-");
}

/** Riconosce un valore scritto a mano (nome o codice) tra quelli noti. */
function riconosci<T extends { id: string }>(valore: string, elenco: readonly T[], nomi: (x: T) => string[]): string | null {
  const n = norm(valore);
  return elenco.find((x) => nomi(x).some((nome) => norm(nome) === n))?.id ?? null;
}

export type RigaImport = { riga: number; dati?: Record<string, string>; errore?: string };

/** Traduce le righe del CSV nei campi del modulo mezzo. Le righe non valide restano con un errore leggibile. */
export function righeImport(csv: string[][]): RigaImport[] {
  if (csv.length < 2) return [];
  const intest = csv[0].map((h) => norm(h));
  const idx = (n: string) => intest.indexOf(n);
  return csv.slice(1).map((r, i) => {
    const num = i + 2;
    const v = (n: string) => (idx(n) >= 0 ? (r[idx(n)] ?? "").trim() : "");
    const marca = MARCHI.find((m) => norm(m.nome) === norm(v("marca")) || m.slug === slug(v("marca")))?.slug;
    if (!marca) return { riga: num, errore: `marchio "${v("marca")}" non riconosciuto` };
    if (!v("modello")) return { riga: num, errore: "manca il modello" };
    const categoria = riconosci(v("categoria"), CATEGORIE, (c) => [c.id, c.nome]);
    if (!categoria) return { riga: num, errore: `categoria "${v("categoria")}" non riconosciuta` };
    const condizione = riconosci(v("condizione"), CONDIZIONI, (c) => [c.id, c.nome, c.slug, c.titolo]);
    if (!condizione) return { riga: num, errore: `condizione "${v("condizione")}" non riconosciuta` };
    return {
      riga: num,
      dati: { marca, modello: v("modello"), categoria, condizione, stato: "BOZZA", anno: v("anno"), prezzo: v("prezzo"), lunghezza: v("lunghezza"), motore: v("motore"), ore: v("ore"), posti: v("posti"), descrizione: v("descrizione"), dotazioni: "", foto: "[]" },
    };
  });
}

/* ---------- Foto abbinate al nome del file ---------- */
/** "capelli-tempest-700-2.jpg" → { chiave: "capelli-tempest-700", ordine: 2 }. */
export function chiaveFoto(nomeFile: string) {
  const base = slug(nomeFile.replace(/\.[a-z0-9]+$/i, ""));
  const m = base.match(/^(.*?)-(\d{1,2})$/);
  return { base, chiave: m ? m[1] : base, ordine: m ? Number(m[2]) : 1 };
}

/** Trova il mezzo giusto: prima per "marca-modello", poi per solo modello se unico. */
export function abbinaMezzo(nomeFile: string, mezzi: { id: string; marca: string; modello: string }[]): { id: string; ordine: number } | null {
  const { base, chiave, ordine } = chiaveFoto(nomeFile);
  const prova = (k: string) => {
    const per = (m: { marca: string; modello: string }) => [slug(`${m.marca} ${m.modello}`), slug(`${MARCHI.find((x) => x.slug === m.marca)?.nome ?? m.marca} ${m.modello}`)];
    const piena = mezzi.filter((m) => per(m).includes(k));
    if (piena.length) return piena;
    const solo = mezzi.filter((m) => slug(m.modello) === k);
    return solo.length === 1 ? solo : [];
  };
  // un nome come "tempest-700" potrebbe finire con un numero che fa parte del modello: si prova prima il nome intero
  const intero = prova(base);
  if (intero.length) return { id: intero[0].id, ordine: 1 };
  const parziale = prova(chiave);
  return parziale.length ? { id: parziale[0].id, ordine } : null;
}
