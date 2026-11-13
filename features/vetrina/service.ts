import "server-only";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { media, promos, settings, vehicles, type Vehicle, type User } from "@/db/schema";
import { audit } from "@/lib/audit";
import { MODELLI_CATALOGO } from "@/lib/brands/modelli";
import type { MezzoInput } from "@/lib/vetrina/catalog";
import { inCorso, oggiRoma, type PromoInput } from "@/lib/vetrina/promo";

/* ---------- Impostazioni della vetrina (banner e contatti) ---------- */
export type VetrinaSettings = { bannerId: string; telefono: string; email: string; indirizzo: string; whatsapp: string; icone: Record<string, string> };
export const VETRINA_DEFAULT: VetrinaSettings = {
  bannerId: "",
  telefono: "0854 7078252",
  email: "marcomichetti@faietamoto.com",
  indirizzo: "Via Valle Roveto 29, 65124 Pescara (PE)",
  whatsapp: "",
  icone: {},
};

export async function getVetrinaSettings(): Promise<VetrinaSettings> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, "vetrina") });
  return { ...VETRINA_DEFAULT, ...((row?.value as Partial<VetrinaSettings>) ?? {}) };
}

export async function saveVetrinaSettings(s: VetrinaSettings, user: User) {
  const prima = await getVetrinaSettings();
  await db
    .insert(settings)
    .values({ key: "vetrina", value: s })
    .onConflictDoUpdate({ target: settings.key, set: { value: s } });
  await audit(user, "vetrina", "settings", "vetrina", "dati della vetrina aggiornati");
  await pulisciFoto([prima.bannerId, ...Object.values(prima.icone ?? {})].filter(Boolean));
}

/* ---------- Foto ---------- */
export async function salvaFoto(mime: string, data: Buffer) {
  const [r] = await db.insert(media).values({ mime, data, size: data.length }).returning({ id: media.id });
  return r.id;
}

export async function leggiFoto(id: string) {
  return db.query.media.findFirst({ where: eq(media.id, id) });
}

/** Elimina dal database le foto non più usate da nessun mezzo (né dal banner). */
async function pulisciFoto(candidati: string[]) {
  if (!candidati.length) return;
  const [tutti, s] = await Promise.all([db.select({ foto: vehicles.foto, brochure: vehicles.brochure }).from(vehicles), getVetrinaSettings()]);
  const usate = new Set([...tutti.flatMap((v) => [...v.foto, v.brochure]), s.bannerId, ...Object.values(s.icone ?? {})]);
  const orfane = candidati.filter((id) => !usate.has(id));
  if (orfane.length) await db.delete(media).where(inArray(media.id, orfane));
}

/* ---------- Mezzi ---------- */
const valori = (d: MezzoInput) => ({
  marca: d.marca,
  modello: d.modello,
  categoria: d.categoria,
  condizione: d.condizione,
  stato: d.stato,
  anno: d.anno ?? null,
  prezzo: d.prezzo ?? null,
  lunghezza: d.lunghezza ?? null,
  motore: d.motore,
  ore: d.ore ?? null,
  posti: d.posti ?? null,
  descrizione: d.descrizione,
  dotazioni: d.dotazioni,
  foto: d.foto,
  brochure: d.brochure,
  inEvidenza: d.inEvidenza,
});

export async function creaMezzo(d: MezzoInput, user: User) {
  const [r] = await db.insert(vehicles).values(valori(d)).returning({ id: vehicles.id });
  await audit(user, "vetrina", "vehicle", r.id, `creato ${d.marca} ${d.modello}`);
  return r.id;
}

export async function aggiornaMezzo(id: string, d: MezzoInput, user: User) {
  const prima = await getMezzo(id);
  if (!prima) throw new Error("Mezzo non trovato.");
  await db.update(vehicles).set(valori(d)).where(eq(vehicles.id, id));
  await pulisciFoto([...prima.foto.filter((f) => !d.foto.includes(f)), ...(prima.brochure && prima.brochure !== d.brochure ? [prima.brochure] : [])]);
  await audit(user, "vetrina", "vehicle", id, `aggiornato ${d.marca} ${d.modello}`);
}

export async function eliminaMezzo(id: string, user: User) {
  const prima = await getMezzo(id);
  if (!prima) return;
  await db.delete(vehicles).where(eq(vehicles.id, id));
  await pulisciFoto([...prima.foto, ...(prima.brochure ? [prima.brochure] : [])]);
  await audit(user, "vetrina", "vehicle", id, `eliminato ${prima.marca} ${prima.modello}`);
}

export async function cambiaStatoMezzo(id: string, stato: "BOZZA" | "PUBBLICATO" | "VENDUTO", user: User) {
  const m = await getMezzo(id);
  if (!m) throw new Error("Mezzo non trovato.");
  if (stato === "PUBBLICATO" && m.condizione !== "DA_ORDINARE" && m.foto.length === 0) throw new Error("Per pubblicare serve almeno una foto.");
  await db.update(vehicles).set({ stato }).where(eq(vehicles.id, id));
  await audit(user, "vetrina", "vehicle", id, `stato ${stato}`);
}

/** Carica i modelli a catalogo dei marchi (solo quelli non ancora presenti). */
export async function caricaCatalogo(user: User) {
  const esistenti = await db.select({ marca: vehicles.marca, modello: vehicles.modello }).from(vehicles).where(eq(vehicles.condizione, "DA_ORDINARE"));
  const chiave = (a: string, b: string) => `${a}|${b.toLowerCase()}`;
  const gia = new Set(esistenti.map((e) => chiave(e.marca, e.modello)));
  const nuovi = MODELLI_CATALOGO.filter((x) => !gia.has(chiave(x.marca, x.modello)));
  for (let i = 0; i < nuovi.length; i += 50) {
    await db.insert(vehicles).values(nuovi.slice(i, i + 50).map((x) => ({ marca: x.marca, modello: x.modello, categoria: x.categoria, condizione: "DA_ORDINARE" as const, stato: "PUBBLICATO" as const, lunghezza: x.lunghezza ?? null, dotazioni: [], foto: [] })));
  }
  await audit(user, "vetrina", "vehicle", "catalogo", `caricati ${nuovi.length} modelli a catalogo`);
  return nuovi.length;
}

/** Mezzi per id (per mostrarli nelle schede dei lead). */
export async function mezziPerId(ids: string[]) {
  const uniche = [...new Set(ids)];
  if (!uniche.length) return new Map<string, Vehicle>();
  const righe = await db.select().from(vehicles).where(inArray(vehicles.id, uniche));
  return new Map(righe.map((v) => [v.id, v]));
}

export async function getMezzo(id: string): Promise<Vehicle | undefined> {
  return db.query.vehicles.findFirst({ where: eq(vehicles.id, id) });
}

export async function elencoMezzi() {
  return db.select().from(vehicles).orderBy(desc(vehicles.updatedAt));
}

/* ---------- Lettura pubblica: solo annunci online ---------- */
export type FiltriVetrina = { condizione?: string; categoria?: string; marca?: string };

export async function mezziPubblici(f: FiltriVetrina = {}) {
  const cond = [ne(vehicles.stato, "BOZZA")];
  if (f.condizione) cond.push(eq(vehicles.condizione, f.condizione));
  if (f.categoria) cond.push(eq(vehicles.categoria, f.categoria));
  if (f.marca) cond.push(eq(vehicles.marca, f.marca));
  const righe = await db
    .select()
    .from(vehicles)
    .where(and(...cond))
    .orderBy(desc(vehicles.inEvidenza), desc(vehicles.updatedAt));
  // I venduti restano visibili in fondo (mostrano che si vende), gli altri prima.
  return [...righe.filter((v) => v.stato === "PUBBLICATO"), ...righe.filter((v) => v.stato === "VENDUTO")];
}

export async function mezzoPubblico(id: string) {
  const m = await getMezzo(id);
  return m && m.stato !== "BOZZA" ? m : undefined;
}

/* ---------- Avvisi e promo ---------- */

const valoriPromo = (d: PromoInput) => ({
  titolo: d.titolo,
  testo: d.testo,
  ctaTipo: d.ctaTipo,
  ctaTesto: d.ctaTesto,
  mezzoId: d.ctaTipo === "MEZZO" ? (d.mezzoId ?? null) : null,
  inizio: d.inizio,
  fine: d.fine,
  attivo: d.attivo,
});

export async function elencoPromo() {
  return db.select().from(promos).orderBy(desc(promos.inizio));
}
export async function creaPromo(d: PromoInput, user: User) {
  const [r] = await db.insert(promos).values(valoriPromo(d)).returning({ id: promos.id });
  await audit(user, "vetrina", "promo", r.id, `avviso creato: ${d.titolo}`);
}
export async function aggiornaPromo(id: string, d: PromoInput, user: User) {
  await db.update(promos).set(valoriPromo(d)).where(eq(promos.id, id));
  await audit(user, "vetrina", "promo", id, `avviso aggiornato: ${d.titolo}`);
}
export async function eliminaPromo(id: string, user: User) {
  await db.delete(promos).where(eq(promos.id, id));
  await audit(user, "vetrina", "promo", id, "avviso eliminato");
}

/** L'avviso da mostrare ora: uno solo, il più recente tra quelli in corso. Un mezzo non più online fa sparire il pulsante. */
export async function promoInCorso() {
  const oggi = oggiRoma();
  const tutti = await db.select().from(promos).orderBy(desc(promos.inizio), desc(promos.createdAt));
  const p = tutti.find((x) => inCorso(x, oggi));
  if (!p) return null;
  let ctaTipo = p.ctaTipo;
  if (ctaTipo === "MEZZO" && !(p.mezzoId && (await mezzoPubblico(p.mezzoId)))) ctaTipo = "NESSUNO";
  return { ...p, ctaTipo };
}
