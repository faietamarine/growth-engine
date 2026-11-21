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
  // "1a2b3c4d-2.jpg": codice del mezzo (le prime 8 cifre, come nell'elenco scaricabile) → nessuna ambiguità.
  const cod = base.match(/^([0-9a-f]{8})(?:-(\d{1,2}))?$/);
  if (cod) {
    const m = mezzi.filter((x) => x.id.toLowerCase().startsWith(cod[1]));
    if (m.length === 1) return { id: m[0].id, ordine: cod[2] ? Number(cod[2]) : 1 };
  }
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

/* ---------- Aggiornamento in massa dei mezzi esistenti ---------- */
/** Colonne dell'elenco scaricabile e del file di aggiornamento: "codice" identifica il mezzo senza ambiguità. */
export const COLONNE_AGGIORNA = ["codice", "marca", "modello", "condizione", "stato", "anno", "prezzo", "listino", "promo", "promo fino al", "motore", "cosa comprende", "descrizione"] as const;

export type Aggiornamento = { riga: number; id?: string; campi?: Record<string, string | number | null>; errore?: string };

const numero = (s: string) => {
  const n = Number(s.replace(/[€\s.]/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : NaN;
};
/** "31/01/2027" o "2027-01-31" → "2027-01-31". */
const data = (s: string) => {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
};

/**
 * Righe del file → modifiche ai mezzi esistenti. Si aggiornano SOLO le celle compilate (vuoto = non toccare;
 * "-" = svuota). Il mezzo si trova dal codice; senza codice da marca + modello, solo se c'è un unico mezzo con quel nome.
 */
export function righeAggiorna(csv: string[][], mezzi: { id: string; marca: string; modello: string }[]): Aggiornamento[] {
  if (csv.length < 2) return [];
  const intest = csv[0].map((h) => norm(h));
  const idx = (n: string) => intest.indexOf(norm(n));
  return csv.slice(1).map((r, i) => {
    const num = i + 2;
    const v = (n: string) => (idx(n) >= 0 ? (r[idx(n)] ?? "").trim() : "");
    let id: string | undefined;
    const codice = v("codice").toLowerCase();
    if (codice) {
      const trovati = mezzi.filter((m) => m.id.toLowerCase().startsWith(codice));
      if (trovati.length !== 1) return { riga: num, errore: `codice "${v("codice")}" non trovato` };
      id = trovati[0].id;
    } else {
      const marca = MARCHI.find((m) => norm(m.nome) === norm(v("marca")) || m.slug === slug(v("marca")))?.slug;
      const trovati = mezzi.filter((m) => m.marca === marca && norm(m.modello) === norm(v("modello")));
      if (trovati.length !== 1) return { riga: num, errore: trovati.length ? `${v("modello")}: più mezzi con lo stesso nome, usa la colonna codice` : `mezzo "${v("marca")} ${v("modello")}" non trovato` };
      id = trovati[0].id;
    }
    const campi: Record<string, string | number | null> = {};
    const svuota = (s: string) => s === "-";
    const testo = (col: string, campo: string, max: number) => {
      const x = v(col);
      if (x) campi[campo] = svuota(x) ? "" : x.slice(0, max);
    };
    const intero = (col: string, campo: string): string | null => {
      const x = v(col);
      if (!x) return null;
      if (svuota(x)) return ((campi[campo] = null), null);
      const n = numero(x);
      if (Number.isNaN(n) || n < 0) return `${col} "${x}" non è un numero`;
      campi[campo] = n;
      return null;
    };
    for (const [col, campo] of [["anno", "anno"], ["prezzo", "prezzo"], ["listino", "prezzoListino"]] as const) {
      const e = intero(col, campo);
      if (e) return { riga: num, errore: e };
    }
    testo("promo", "promo", 40);
    testo("motore", "motore", 120);
    testo("descrizione", "descrizione", 4000);
    const inc = v("cosa comprende");
    if (inc) campi.incluso = svuota(inc) ? "" : inc.split(/\s*\|\s*|\n/).filter(Boolean).join("\n").slice(0, 1000);
    const pf = v("promo fino al");
    if (pf) {
      if (svuota(pf)) campi.promoFine = null;
      else {
        const d = data(pf);
        if (!d) return { riga: num, errore: `data "${pf}" non valida (scrivi 31/01/2027)` };
        campi.promoFine = d;
      }
    }
    const st = v("stato");
    if (st) {
      const s = norm(st);
      const stato = s.startsWith("online") || s === "pubblicato" ? "PUBBLICATO" : s.startsWith("bozza") ? "BOZZA" : s.startsWith("vendut") ? "VENDUTO" : null;
      if (!stato) return { riga: num, errore: `stato "${st}" non riconosciuto (Online, Bozza, Venduto)` };
      campi.stato = stato;
    }
    if (!Object.keys(campi).length) return { riga: num, id, errore: "nessuna cella da aggiornare" };
    return { riga: num, id, campi };
  });
}

/** Una riga dell'elenco scaricabile (separatore ; per Excel italiano). */
export function rigaElenco(m: { id: string; marca: string; modello: string; condizione: string; stato: string; anno: number | null; prezzo: number | null; prezzoListino: number | null; promo: string; promoFine: string | null; motore: string; incluso: string; descrizione: string }) {
  const marca = MARCHI.find((x) => x.slug === m.marca)?.nome ?? m.marca;
  const cond = CONDIZIONI.find((c) => c.id === m.condizione)?.nome ?? m.condizione;
  const stato = m.stato === "PUBBLICATO" ? "Online" : m.stato === "VENDUTO" ? "Venduto" : "Bozza";
  const fine = m.promoFine ? m.promoFine.split("-").reverse().join("/") : "";
  const celle = [m.id.slice(0, 8), marca, m.modello, cond, stato, m.anno ?? "", m.prezzo ?? "", m.prezzoListino ?? "", m.promo, fine, m.motore, m.incluso.split("\n").join(" | "), m.descrizione];
  return celle.map((c) => {
    const s = String(c);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(";");
}
