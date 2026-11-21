import { currentUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { db } from "@/db/client";
import { vehicles } from "@/db/schema";
import { COLONNE_AGGIORNA, rigaElenco } from "@/lib/vetrina/strumenti";

/** Elenco di tutti i mezzi da aprire in Excel, correggere e ricaricare con "Aggiorna da file". */
export async function GET() {
  const u = await currentUser();
  if (!u || !can(u.role, "contenuti:scrivi")) return new Response("Accesso non consentito", { status: 403 });
  const righe = (await db.select().from(vehicles)).sort((a, b) => a.marca.localeCompare(b.marca) || a.modello.localeCompare(b.modello));
  const csv = [COLONNE_AGGIORNA.join(";"), ...righe.map(rigaElenco)].join("\n");
  return new Response("﻿" + csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="elenco-mezzi.csv"' } });
}
