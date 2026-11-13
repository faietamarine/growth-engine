import "server-only";
import { and, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { leads, media, promos, settings, vehicles, vehicleViews, type Vehicle, type User } from "@/db/schema";
import { audit } from "@/lib/audit";
import { MODELLI_CATALOGO } from "@/lib/brands/modelli";
import { mezzoSchema, controllaMezzo, MAX_FOTO, type MezzoInput } from "@/lib/vetrina/catalog";
import { abbinaMezzo, nuovoPrezzo, type RigaImport, type Variazione } from "@/lib/vetrina/strumenti";
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


/* ---------- Strumenti di lavoro ---------- */

/** Copia di un mezzo come bozza (le foto restano le stesse: nessun duplicato nel database). */
export async function duplicaMezzo(id: string, user: User) {
  const m = await getMezzo(id);
  if (!m) throw new Error("Mezzo non trovato.");
  const { id: _id, createdAt: _c, updatedAt: _u, ...resto } = m;
  const [r] = await db.insert(vehicles).values({ ...resto, modello: `${m.modello} (copia)`.slice(0, 120), stato: "BOZZA", inEvidenza: false }).returning({ id: vehicles.id });
  await audit(user, "vetrina", "vehicle", r.id, `duplicato da ${m.marca} ${m.modello}`);
  return r.id;
}

export type FiltroPrezzi = { marca?: string; condizione?: string };

/** Anteprima (o applicazione) di una variazione di prezzo di gruppo. I venduti e i mezzi senza prezzo non cambiano. */
export async function variaPrezzi(f: FiltroPrezzi, v: Variazione, user: User | null) {
  const cond = [ne(vehicles.stato, "VENDUTO")];
  if (f.marca) cond.push(eq(vehicles.marca, f.marca));
  if (f.condizione) cond.push(eq(vehicles.condizione, f.condizione));
  const righe = (await db.select().from(vehicles).where(and(...cond))).filter((m) => m.prezzo != null && m.prezzo > 0);
  const cambi = righe.map((m) => ({ id: m.id, nome: `${m.marca} ${m.modello}`, prima: m.prezzo as number, dopo: nuovoPrezzo(m.prezzo as number, v) })).filter((c) => c.dopo !== c.prima);
  if (user) {
    for (const c of cambi) await db.update(vehicles).set({ prezzo: c.dopo }).where(eq(vehicles.id, c.id));
    await audit(user, "vetrina", "vehicle", "prezzi", `prezzi di gruppo: ${cambi.length} mezzi (${v.tipo === "PERCENTUALE" ? `${v.valore}%` : `${v.valore} €`})`);
  }
  return cambi;
}

/** Mezzi online da molto tempo senza modifiche (usato e pronta consegna): vanno ravvivati o tolti. */
export async function mezziFermi(giorni = 90) {
  const limite = new Date(Date.now() - giorni * 86_400_000);
  return db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.stato, "PUBBLICATO"), ne(vehicles.condizione, "DA_ORDINARE"), lt(vehicles.updatedAt, limite)))
    .orderBy(vehicles.updatedAt);
}

/** Importa i mezzi di un CSV già letto. Tutto entra come bozza (tranne i modelli a catalogo, che possono andare online senza foto). */
export async function importaMezzi(righe: RigaImport[], user: User) {
  let creati = 0;
  const errori: string[] = [];
  for (const r of righe) {
    if (!r.dati) {
      errori.push(`Riga ${r.riga}: ${r.errore}`);
      continue;
    }
    const p = mezzoSchema.safeParse({ ...r.dati, stato: r.dati.condizione === "DA_ORDINARE" ? "PUBBLICATO" : "BOZZA" });
    if (!p.success) {
      errori.push(`Riga ${r.riga}: ${p.error.issues[0].message}`);
      continue;
    }
    const err = controllaMezzo(p.data);
    if (err) {
      errori.push(`Riga ${r.riga}: ${err}`);
      continue;
    }
    await db.insert(vehicles).values(valori(p.data));
    creati++;
  }
  await audit(user, "vetrina", "vehicle", "import", `importati ${creati} mezzi da CSV`);
  return { creati, errori };
}

/** Aggiunge le foto caricate al mezzo che corrisponde al nome del file. Le foto senza abbinamento vengono eliminate. */
export async function abbinaFoto(file: { nome: string; id: string }[], user: User) {
  const mezzi = await db.select({ id: vehicles.id, marca: vehicles.marca, modello: vehicles.modello, foto: vehicles.foto }).from(vehicles);
  const per = new Map<string, { ordine: number; id: string }[]>();
  const senza: string[] = [];
  const scartate: string[] = [];
  for (const f of file) {
    const a = abbinaMezzo(f.nome, mezzi);
    if (!a) {
      senza.push(f.nome);
      scartate.push(f.id);
      continue;
    }
    per.set(a.id, [...(per.get(a.id) ?? []), { ordine: a.ordine, id: f.id }]);
  }
  let aggiornati = 0;
  for (const [mid, lista] of per) {
    const m = mezzi.find((x) => x.id === mid)!;
    const nuove = lista.sort((a, b) => a.ordine - b.ordine).map((x) => x.id);
    const tutte = [...m.foto, ...nuove].slice(0, MAX_FOTO);
    scartate.push(...nuove.filter((x) => !tutte.includes(x)));
    await db.update(vehicles).set({ foto: tutte }).where(eq(vehicles.id, mid));
    aggiornati++;
  }
  await pulisciFoto(scartate);
  await audit(user, "vetrina", "vehicle", "foto", `foto abbinate a ${aggiornati} mezzi, ${senza.length} senza abbinamento`);
  return { aggiornati, abbinate: file.length - senza.length, senza };
}

/* ---------- Visite e richieste per mezzo ---------- */
export async function registraVisita(vehicleId: string) {
  const giorno = oggiRoma();
  try {
    await db
      .insert(vehicleViews)
      .values({ vehicleId, day: giorno, views: 1 })
      .onConflictDoUpdate({ target: [vehicleViews.vehicleId, vehicleViews.day], set: { views: sql`${vehicleViews.views} + 1` } });
  } catch {
    /* le statistiche non devono mai rompere la pagina */
  }
}

export type RigaReport = { id: string; nome: string; stato: string; visite: number; richieste: number; brochure: number; avvisi: number };

/** Visite (ultimi `giorni`) e richieste ricevute per ogni mezzo. */
export async function reportMezzi(giorni = 30): Promise<RigaReport[]> {
  const da = new Date(Date.now() - giorni * 86_400_000);
  const dal = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(da);
  const [mezzi, visite, richieste] = await Promise.all([
    db.select().from(vehicles),
    db.select().from(vehicleViews).where(gte(vehicleViews.day, dal)),
    db.select({ answers: leads.answers }).from(leads).where(and(eq(leads.channel, "SITO"), gte(leads.createdAt, da))),
  ]);
  const v = new Map<string, number>();
  for (const r of visite) v.set(r.vehicleId, (v.get(r.vehicleId) ?? 0) + r.views);
  const rich = new Map<string, { visita: number; brochure: number; avvisi: number }>();
  for (const r of richieste) {
    const id = r.answers?.Annuncio?.match(/\/vetrina\/mezzo\/([0-9a-f-]{36})/i)?.[1];
    if (!id) continue;
    const x = rich.get(id) ?? { visita: 0, brochure: 0, avvisi: 0 };
    const tipo = r.answers?.Richiesta ?? "";
    if (/brochure/i.test(tipo)) x.brochure++;
    else if (/avviso/i.test(tipo)) x.avvisi++;
    else x.visita++;
    rich.set(id, x);
  }
  return mezzi
    .filter((m) => m.stato !== "BOZZA" || v.has(m.id) || rich.has(m.id))
    .map((m) => ({ id: m.id, nome: `${m.marca} ${m.modello}`, stato: m.stato, visite: v.get(m.id) ?? 0, richieste: rich.get(m.id)?.visita ?? 0, brochure: rich.get(m.id)?.brochure ?? 0, avvisi: rich.get(m.id)?.avvisi ?? 0 }))
    .sort((a, b) => b.visite + b.richieste * 10 - (a.visite + a.richieste * 10));
}

/* ---------- Richieste del sito da richiamare ---------- */
export async function richiesteDaRichiamare() {
  const da = new Date(Date.now() - 7 * 86_400_000);
  const righe = await db
    .select()
    .from(leads)
    .where(and(eq(leads.channel, "SITO"), ne(leads.status, "SCARTATO"), gte(leads.createdAt, da)))
    .orderBy(desc(leads.createdAt));
  return righe.filter((l) => !l.calledAt);
}

export async function segnaRichiamato(id: string, user: User) {
  await db.update(leads).set({ calledAt: new Date() }).where(eq(leads.id, id));
  await audit(user, "lead", "lead", id, "richiamato");
}
