import { NextResponse } from "next/server";
import { importAutorizzato } from "@/lib/import-token";
import { salvaFoto } from "@/features/vetrina/service";

export const dynamic = "force-dynamic";

const MAX = 1_600_000;
const FIRME: Record<string, number[]> = { "image/jpeg": [0xff, 0xd8, 0xff], "image/png": [0x89, 0x50, 0x4e, 0x47], "image/webp": [0x52, 0x49, 0x46, 0x46] };

/** Carica una foto già compressa e ne restituisce l'id; il mezzo si aggiorna poi con /api/import/mezzi. */
export async function POST(req: Request) {
  if (!importAutorizzato(req)) return NextResponse.json({ errore: "Non trovato" }, { status: 404 });
  const f = await req.formData().catch(() => null);
  const file = f?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ errore: "Nessun file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ errore: "Foto troppo pesante" }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = Object.keys(FIRME).find((m) => FIRME[m].every((b, i) => buf[i] === b));
  if (!mime) return NextResponse.json({ errore: "Formato non supportato" }, { status: 415 });
  return NextResponse.json({ id: await salvaFoto(mime, buf) }, { status: 201 });
}
