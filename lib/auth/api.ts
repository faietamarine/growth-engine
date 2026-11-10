import "server-only";
import { NextResponse } from "next/server";
import { currentUser } from "./session";
import { can, type Action } from "@/lib/rbac";

/** Per le route API: restituisce l'utente oppure la risposta di errore già pronta. */
export async function apiUser(action: Action) {
  const u = await currentUser();
  if (!u) return { error: NextResponse.json({ errore: "Accesso richiesto" }, { status: 401 }) } as const;
  if (!can(u.role, action)) return { error: NextResponse.json({ errore: "Permesso negato" }, { status: 403 }) } as const;
  return { user: u } as const;
}

/** Difesa CSRF per le richieste che modificano dati: l'origine deve essere questa app. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // download da form senza Origin: il cookie SameSite=Lax copre il resto
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

export function fileResponse(body: string, filename: string, type: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": `${type}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
