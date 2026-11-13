import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { salvaFoto } from "@/features/vetrina/service";

/* Caricamento brochure PDF dall'area riservata (max 5 MB, controllo sul contenuto reale del file). */
const MAX = 5_000_000;

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || !can(u.role, "contenuti:scrivi")) return NextResponse.json({ errore: "Accesso non consentito" }, { status: 403 });
  let file: File | null = null;
  try {
    const x = (await req.formData()).get("file");
    file = x instanceof File ? x : null;
  } catch {
    return NextResponse.json({ errore: "Richiesta non valida" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ errore: "Nessun file" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ errore: "PDF troppo pesante (massimo 5 MB)" }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") return NextResponse.json({ errore: "Il file non è un PDF" }, { status: 415 });
  const id = await salvaFoto("application/pdf", buf);
  return NextResponse.json({ id, nome: file.name.slice(0, 80) }, { status: 201 });
}
