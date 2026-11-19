import "server-only";
import { and, asc, desc, eq, gte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { siteEvents as events, leads, posts, type Evento, type Post, type User } from "@/db/schema";
import { audit } from "@/lib/audit";
import { slug as creaSlug } from "@/lib/vetrina/strumenti";
import { oggiRoma } from "@/lib/vetrina/promo";
import type { EventoInput, PostInput } from "@/lib/vetrina/contenuti";
import { pulisciFotoContenuti } from "./service";

/** Indirizzo leggibile e unico: "come-scegliere-il-gommone", poi "-2", "-3"… se già usato. */
async function slugLibero(tabella: typeof posts | typeof events, titolo: string, escludi?: string) {
  const base = creaSlug(titolo).slice(0, 70).replace(/-+$/, "") || "pagina";
  for (let n = 1; n < 100; n++) {
    const s = n === 1 ? base : `${base}-${n}`;
    const [x] = await db
      .select({ id: tabella.id })
      .from(tabella)
      .where(escludi ? and(eq(tabella.slug, s), ne(tabella.id, escludi)) : eq(tabella.slug, s));
    if (!x) return s;
  }
  return `${base}-${Date.now()}`;
}

/* ---------- Blog ---------- */
export async function elencoPost() {
  return db.select().from(posts).orderBy(desc(posts.updatedAt));
}
export async function getPost(id: string) {
  const [p] = await db.select().from(posts).where(eq(posts.id, id));
  return p ?? null;
}
export async function postPubblici(limite = 50): Promise<Post[]> {
  return db.select().from(posts).where(eq(posts.stato, "PUBBLICATO")).orderBy(desc(posts.pubblicatoIl), desc(posts.createdAt)).limit(limite);
}
export async function postPerSlug(s: string) {
  const [p] = await db.select().from(posts).where(and(eq(posts.slug, s), eq(posts.stato, "PUBBLICATO")));
  return p ?? null;
}
const valoriPost = (d: PostInput) => ({
  titolo: d.titolo,
  sommario: d.sommario,
  testo: d.testo,
  foto: d.foto,
  stato: d.stato,
  // La data si fissa alla prima pubblicazione; si può correggere a mano.
  pubblicatoIl: d.pubblicatoIl || (d.stato === "PUBBLICATO" ? oggiRoma() : null),
});
export async function creaPost(d: PostInput, user: User) {
  const [r] = await db.insert(posts).values({ ...valoriPost(d), slug: await slugLibero(posts, d.titolo) }).returning({ id: posts.id });
  await audit(user, "vetrina", "post", r.id, `articolo creato: ${d.titolo}`);
  return r.id;
}
export async function aggiornaPost(id: string, d: PostInput, user: User) {
  const prima = await getPost(id);
  if (!prima) throw new Error("Articolo non trovato");
  // Una volta pubblicato l'indirizzo non cambia più (Google e i link condivisi restano validi).
  const slug = prima.stato === "PUBBLICATO" || prima.pubblicatoIl ? prima.slug : await slugLibero(posts, d.titolo, id);
  await db.update(posts).set({ ...valoriPost(d), pubblicatoIl: d.pubblicatoIl || prima.pubblicatoIl || (d.stato === "PUBBLICATO" ? oggiRoma() : null), slug }).where(eq(posts.id, id));
  await audit(user, "vetrina", "post", id, `articolo aggiornato: ${d.titolo}`);
  if (prima.foto && prima.foto !== d.foto) await pulisciFotoContenuti([prima.foto]);
}
export async function eliminaPost(id: string, user: User) {
  const p = await getPost(id);
  await db.delete(posts).where(eq(posts.id, id));
  if (p?.foto) await pulisciFotoContenuti([p.foto]);
  await audit(user, "vetrina", "post", id, "articolo eliminato");
}

/* ---------- Eventi e prove in mare ---------- */
export async function elencoEventi() {
  return db.select().from(events).orderBy(desc(events.data));
}
export async function getEvento(id: string) {
  const [e] = await db.select().from(events).where(eq(events.id, id));
  return e ?? null;
}
/** Eventi pubblicati non ancora finiti, dal più vicino. */
export async function eventiInArrivo(limite = 20): Promise<Evento[]> {
  const oggi = oggiRoma();
  return db
    .select()
    .from(events)
    .where(and(eq(events.stato, "PUBBLICATO"), or(gte(events.data, oggi), gte(events.dataFine, oggi))))
    .orderBy(asc(events.data))
    .limit(limite);
}
export async function eventoPerSlug(s: string) {
  const [e] = await db.select().from(events).where(and(eq(events.slug, s), eq(events.stato, "PUBBLICATO")));
  return e ?? null;
}
const valoriEvento = (d: EventoInput) => ({ ...d, dataFine: d.dataFine || null });
export async function creaEvento(d: EventoInput, user: User) {
  const [r] = await db.insert(events).values({ ...valoriEvento(d), slug: await slugLibero(events, `${d.titolo} ${d.data}`) }).returning({ id: events.id });
  await audit(user, "vetrina", "evento", r.id, `evento creato: ${d.titolo}`);
  return r.id;
}
export async function aggiornaEvento(id: string, d: EventoInput, user: User) {
  const prima = await getEvento(id);
  if (!prima) throw new Error("Evento non trovato");
  const slug = prima.stato === "PUBBLICATO" ? prima.slug : await slugLibero(events, `${d.titolo} ${d.data}`, id);
  await db.update(events).set({ ...valoriEvento(d), slug }).where(eq(events.id, id));
  await audit(user, "vetrina", "evento", id, `evento aggiornato: ${d.titolo}`);
  if (prima.foto && prima.foto !== d.foto) await pulisciFotoContenuti([prima.foto]);
}
export async function eliminaEvento(id: string, user: User) {
  const e = await getEvento(id);
  await db.delete(events).where(eq(events.id, id));
  if (e?.foto) await pulisciFotoContenuti([e.foto]);
  await audit(user, "vetrina", "evento", id, "evento eliminato");
}

/** Iscritti (persone) per evento: le iscrizioni sono lead con la risposta "EventoId". */
export async function iscrittiPerEvento(): Promise<Record<string, number>> {
  const righe = await db
    .select({
      evento: sql<string>`json_extract(${leads.answers}, '$.EventoId')`,
      persone: sql<number>`coalesce(sum(cast(coalesce(json_extract(${leads.answers}, '$.Persone'), '1') as integer)), 0)`,
    })
    .from(leads)
    .where(sql`json_extract(${leads.answers}, '$.EventoId') is not null`)
    .groupBy(sql`json_extract(${leads.answers}, '$.EventoId')`);
  return Object.fromEntries(righe.map((r) => [r.evento, Number(r.persone)]));
}

/** Carica come bozze gli articoli di partenza non ancora presenti (stesso titolo = già presente). */
export async function caricaArticoliIniziali(user: User) {
  const { ARTICOLI_INIZIALI } = await import("@/lib/vetrina/articoli-iniziali");
  const esistenti = new Set((await db.select({ titolo: posts.titolo }).from(posts)).map((p) => p.titolo));
  let n = 0;
  for (const a of ARTICOLI_INIZIALI) {
    if (esistenti.has(a.titolo)) continue;
    await creaPost({ ...a, foto: "", stato: "BOZZA", pubblicatoIl: "" }, user);
    n++;
  }
  return n;
}
