import type { Vehicle } from "@/db/schema";
import { getMarchio } from "@/lib/brands/catalog";
import { nomeCategoria, offerta } from "./catalog";

/*
 * Catalogo per Meta (Commerce Manager → WhatsApp Business, Facebook, Instagram).
 * Meta legge questo file CSV una volta al giorno: ogni articolo ha foto, prezzo, link alla scheda e disponibilità.
 * Entrano solo i mezzi online di pronta consegna e usato con foto e prezzo (Meta li richiede);
 * i modelli "da ordinare" senza foto e i prezzi "su richiesta" restano fuori.
 */

export const COLONNE_META = ["id", "title", "description", "availability", "condition", "price", "sale_price", "sale_price_effective_date", "link", "image_link", "additional_image_link", "brand", "custom_label_0", "custom_label_1"] as const;

export type EsclusoMeta = { id: string; nome: string; motivo: string };

const prezzoMeta = (n: number) => `${n.toFixed(2)} EUR`;
const pulisci = (s: string) => s.replace(/\s+/g, " ").trim();

/** Perché un mezzo non può stare nel catalogo Meta (null = può). */
export function motivoEsclusione(m: Pick<Vehicle, "stato" | "condizione" | "prezzo" | "foto">): string | null {
  if (m.stato !== "PUBBLICATO") return m.stato === "VENDUTO" ? "Venduto" : "Non online";
  if (m.condizione === "DA_ORDINARE") return "Modello da ordinare";
  if (m.prezzo == null) return "Prezzo su richiesta (Meta vuole il prezzo)";
  if (!m.foto.length) return "Senza foto";
  return null;
}

/** Riga del catalogo: prezzo pieno = listino ufficiale se c'è una promo, prezzo scontato = prezzo Faieta. */
export function rigaMeta(m: Vehicle, base: string, oggi: string): Record<(typeof COLONNE_META)[number], string> {
  const marca = getMarchio(m.marca)?.nome ?? m.marca;
  const titolo = pulisci(`${marca} ${m.modello}${m.anno && m.condizione === "USATO" ? ` (${m.anno})` : ""}`).slice(0, 150);
  const o = offerta(m, oggi);
  const prezzo = m.prezzo as number;
  const dettagli = [nomeCategoria(m.categoria), m.condizione === "USATO" ? "usato" : "pronta consegna", m.motore, m.anno ? `anno ${m.anno}` : "", o?.etichetta ?? ""].filter(Boolean).join(" · ");
  const descrizione = pulisci(`${titolo}. ${dettagli}. ${m.descrizione}`).slice(0, 5000) || titolo;
  const foto = m.foto.map((f) => `${base}/media/${f}`);
  return {
    id: m.id,
    title: titolo,
    description: descrizione,
    availability: "in stock",
    condition: m.condizione === "USATO" ? "used" : "new",
    price: prezzoMeta(o?.listino ?? prezzo),
    sale_price: o?.listino ? prezzoMeta(prezzo) : "",
    sale_price_effective_date: o?.listino && o.scade ? `${oggi}T00:00+01:00/${o.scade}T23:59+01:00` : "",
    link: `${base}/vetrina/mezzo/${m.id}?utm_source=whatsapp&utm_medium=catalogo&utm_campaign=catalogo-meta`,
    image_link: foto[0],
    additional_image_link: foto.slice(1, 11).join(","),
    brand: marca,
    custom_label_0: m.condizione === "USATO" ? "Usato" : "Pronta consegna",
    custom_label_1: nomeCategoria(m.categoria),
  };
}

const campoCsv = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function csvMeta(mezzi: Vehicle[], base: string, oggi: string) {
  const inclusi = mezzi.filter((m) => !motivoEsclusione(m));
  const righe = inclusi.map((m) => rigaMeta(m, base, oggi));
  const testo = [COLONNE_META.join(","), ...righe.map((r) => COLONNE_META.map((c) => campoCsv(r[c])).join(","))].join("\n");
  return { testo, inclusi: inclusi.length };
}
