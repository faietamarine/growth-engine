import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, type User } from "@/db/schema";
import { can, type Action } from "@/lib/rbac";
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession } from "./token";

export async function createSession(user: Pick<User, "id" | "name" | "role">) {
  const token = await signSession({ sub: user.id, name: user.name, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Utente corrente, riletto dal database a ogni richiesta: se un Admin disattiva
 * un utente o ne cambia il ruolo, l'effetto è immediato (il token da solo non basta).
 */
export async function currentUser(): Promise<User | null> {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const u = await db.query.users.findFirst({ where: eq(users.id, s.sub) });
  return u && u.active ? u : null;
}

/** Da usare in pagine e Server Actions: senza utente → login; senza permesso → dashboard con avviso. */
export async function requireUser(action?: Action): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (action && !can(u.role, action)) redirect("/dashboard?accesso=negato");
  return u;
}
