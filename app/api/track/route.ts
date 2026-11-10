import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicLanding, trackVisit } from "@/features/landing/service";

const schema = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,60}$/), variante: z.enum(["A", "B"]) });

/** Conta una visita a una landing pubblicata. Una per sessione (lo garantisce la pagina). */
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 500) return NextResponse.json({ ok: false }, { status: 413 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ ok: false }, { status: 400 });
  const d = await getPublicLanding(p.data.slug);
  if (!d) return NextResponse.json({ ok: false }, { status: 404 });
  // Senza test attivo tutte le visite contano come variante A.
  const v = d.landing.abTest?.attivo ? p.data.variante : "A";
  await trackVisit(p.data.slug, v);
  return NextResponse.json({ ok: true });
}
