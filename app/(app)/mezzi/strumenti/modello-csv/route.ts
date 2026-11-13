import { currentUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { MODELLO_CSV } from "@/lib/vetrina/strumenti";

export async function GET() {
  const u = await currentUser();
  if (!u || !can(u.role, "contenuti:scrivi")) return new Response("Accesso non consentito", { status: 403 });
  return new Response("﻿" + MODELLO_CSV, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="modello-importazione-mezzi.csv"' } });
}
