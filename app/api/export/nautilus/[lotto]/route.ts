import { NextResponse } from "next/server";
import { apiUser, fileResponse } from "@/lib/auth/api";
import { rebuildBatch } from "@/features/leads/service";

/** Scarica di nuovo un lotto già consegnato (non cambia nulla nei dati). */
export async function GET(_: Request, { params }: { params: Promise<{ lotto: string }> }) {
  const r = await apiUser("lead:consegna");
  if ("error" in r) return r.error;
  const { lotto } = await params;
  if (!/^[A-Z0-9-]{4,40}$/.test(lotto)) return NextResponse.json({ errore: "Lotto non valido" }, { status: 400 });
  const file = await rebuildBatch(lotto, r.user);
  if (!file) return NextResponse.json({ errore: "Lotto non trovato" }, { status: 404 });
  return fileResponse(JSON.stringify(file, null, 2), `lead-nautilus-${lotto}.json`, "application/json");
}
