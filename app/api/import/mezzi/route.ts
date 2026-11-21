import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { vehicles } from "@/db/schema";
import { audit } from "@/lib/audit";
import { importAutorizzato, UTENTE_IMPORT } from "@/lib/import-token";
import { CATEGORIE, CONDIZIONI } from "@/lib/vetrina/catalog";
import { MARCHI } from "@/lib/brands/catalog";

export const dynamic = "force-dynamic";

/** Elenco dei mezzi (per abbinare cartelle e foto). */
export async function GET(req: Request) {
  if (!importAutorizzato(req)) return NextResponse.json({ errore: "Non trovato" }, { status: 404 });
  const righe = await db.select().from(vehicles);
  return NextResponse.json(
    righe.map((m) => ({ id: m.id, marca: m.marca, modello: m.modello, categoria: m.categoria, condizione: m.condizione, stato: m.stato, anno: m.anno, prezzo: m.prezzo, prezzoListino: m.prezzoListino, motore: m.motore, foto: m.foto.length, descrizione: m.descrizione, incluso: m.incluso })),
  );
}

const testo = (max: number) => z.string().trim().max(max);
const campi = z
  .object({
    descrizione: testo(4000),
    incluso: testo(1000),
    motore: testo(120),
    dotazioni: z.array(testo(120)).max(40),
    anno: z.number().int().min(1950).max(2100).nullable(),
    prezzo: z.number().int().min(0).max(50_000_000).nullable(),
    prezzoListino: z.number().int().min(0).max(50_000_000).nullable(),
    lunghezza: z.number().min(0).max(100).nullable(),
    stato: z.enum(["BOZZA", "PUBBLICATO", "VENDUTO"]),
    /** Ordine delle foto (id già caricati): la prima è la copertina. */
    foto: z.array(z.string().uuid()).max(12),
  })
  .partial();

const nuovo = z.object({
  marca: z.enum(MARCHI.map((m) => m.slug) as [string, ...string[]]),
  modello: testo(120).min(1),
  categoria: z.enum(CATEGORIE.map((c) => c.id) as [string, ...string[]]),
  condizione: z.enum(CONDIZIONI.map((c) => c.id) as [string, ...string[]]),
});

/** Aggiorna un mezzo esistente ({ id, campi }) oppure ne crea uno in bozza ({ nuovo, campi }). */
export async function POST(req: Request) {
  if (!importAutorizzato(req)) return NextResponse.json({ errore: "Non trovato" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const c = campi.safeParse(body?.campi ?? {});
  if (!c.success) return NextResponse.json({ errore: c.error.issues[0].message }, { status: 422 });
  if (c.data.stato === "PUBBLICATO" && c.data.foto && !c.data.foto.length) return NextResponse.json({ errore: "Per pubblicare serve almeno una foto" }, { status: 422 });
  let id: string;
  if (body?.nuovo) {
    const n = nuovo.safeParse(body.nuovo);
    if (!n.success) return NextResponse.json({ errore: n.error.issues[0].message }, { status: 422 });
    const [r] = await db
      .insert(vehicles)
      .values({ ...n.data, categoria: n.data.categoria as never, condizione: n.data.condizione as never, stato: "BOZZA", ...c.data, foto: c.data.foto ?? [], dotazioni: c.data.dotazioni ?? [] })
      .returning({ id: vehicles.id });
    id = r.id;
    await audit(UTENTE_IMPORT, "vetrina", "vehicle", id, `creato da caricamento automatico: ${n.data.modello}`);
  } else {
    if (!z.string().uuid().safeParse(body?.id).success) return NextResponse.json({ errore: "id mancante" }, { status: 422 });
    const [m] = await db.select({ id: vehicles.id, foto: vehicles.foto }).from(vehicles).where(eq(vehicles.id, body.id));
    if (!m) return NextResponse.json({ errore: "Mezzo non trovato" }, { status: 404 });
    if (c.data.stato === "PUBBLICATO" && !(c.data.foto ?? m.foto).length) return NextResponse.json({ errore: "Per pubblicare serve almeno una foto" }, { status: 422 });
    await db.update(vehicles).set({ ...c.data, updatedAt: new Date() }).where(eq(vehicles.id, m.id));
    id = m.id;
    await audit(UTENTE_IMPORT, "vetrina", "vehicle", id, `aggiornato da caricamento automatico: ${Object.keys(c.data).join(", ")}`);
  }
  revalidatePath("/vetrina", "layout");
  revalidatePath("/mezzi");
  return NextResponse.json({ ok: true, id });
}
