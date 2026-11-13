import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { salvaFoto } from "@/features/vetrina/service";

/* Caricamento foto dall'area riservata. Il browser le comprime prima dell'invio (max ~1,6 MB qui). */
const MAX = 1_600_000;
const TIPI: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || !can(u.role, "contenuti:scrivi")) return NextResponse.json({ errore: "Accesso non consentito" }, { status: 403 });
  let file: File | null = null;
  try {
    const f = await req.formData();
    const x = f.get("file");
    file = x instanceof File ? x : null;
  } catch {
    return NextResponse.json({ errore: "Richiesta non valida" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ errore: "Nessun file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ errore: "Foto troppo pesante" }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  // Si controlla il contenuto vero del file, non solo il tipo dichiarato.
  const mime = Object.keys(TIPI).find((m) => TIPI[m].some((sig) => sig.every((b, i) => buf[i] === b)));
  if (!mime) return NextResponse.json({ errore: "Formato non supportato (usa JPG, PNG o WebP)" }, { status: 415 });
  const id = await salvaFoto(mime, buf);
  return NextResponse.json({ id }, { status: 201 });
}
