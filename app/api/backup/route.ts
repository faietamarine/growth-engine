import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { db } from "@/db/client";
import { leads, promos, settings, vehicles } from "@/db/schema";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/* Copia di sicurezza (solo Admin): dati della vetrina e lead in un unico file JSON. Foto e PDF esclusi. */
export async function GET() {
  const u = await currentUser();
  if (!u || !can(u.role, "impostazioni:gestisci")) return NextResponse.json({ errore: "Accesso non consentito" }, { status: 403 });
  const [v, p, s, l] = await Promise.all([db.select().from(vehicles), db.select().from(promos), db.select().from(settings), db.select().from(leads)]);
  await audit(u, "sistema", "backup", "json", "copia dei dati scaricata");
  const giorno = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify({ creatoIl: new Date().toISOString(), mezzi: v, avvisi: p, impostazioni: s, lead: l }, null, 1), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="faieta-marine-copia-${giorno}.json"`, "cache-control": "no-store" },
  });
}
