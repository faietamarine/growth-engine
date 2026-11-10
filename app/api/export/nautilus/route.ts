import { NextResponse } from "next/server";
import { apiUser, fileResponse, sameOrigin } from "@/lib/auth/api";
import { exportPendingToNautilus } from "@/features/leads/service";

/** Consegna i lead in coda: scarica il file da importare in Nautilus EVO e li segna come consegnati. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ errore: "Origine non valida" }, { status: 403 });
  const r = await apiUser("lead:consegna");
  if ("error" in r) return r.error;
  const file = await exportPendingToNautilus(r.user);
  if (!file) return NextResponse.redirect(new URL("/lead?esito=vuoto", req.url), 303);
  return fileResponse(JSON.stringify(file, null, 2), `lead-nautilus-${file.lotto}.json`, "application/json");
}
