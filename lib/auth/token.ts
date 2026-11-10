// Firma e verifica del token di sessione. Nessuna dipendenza da Node: usato anche dal middleware.
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/db/schema";

export const SESSION_COOKIE = "nge_session";
export const SESSION_HOURS = 10;

export type SessionPayload = { sub: string; name: string; role: Role };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET mancante o troppo corta (servono almeno 32 caratteri): vedi README.");
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload) {
  return new SignJWT({ name: p.name, role: p.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.name !== "string" || typeof payload.role !== "string") return null;
    return { sub: payload.sub, name: payload.name, role: payload.role as Role };
  } catch {
    return null;
  }
}
