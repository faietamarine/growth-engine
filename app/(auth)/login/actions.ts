"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createSession, destroySession, currentUser } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export type LoginState = { errore?: string; email?: string };

// Blocco dopo 5 tentativi sbagliati in 15 minuti (per indirizzo email, memoria del server).
const tentativi = new Map<string, { n: number; dal: number }>();
const FINESTRA = 15 * 60 * 1000;

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Email non valida"),
  password: z.string().min(1, "Inserisci la password"),
  da: z.string().optional(),
});

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errore: parsed.error.issues[0].message, email: String(form.get("email") ?? "") };
  const { email, password, da } = parsed.data;

  const t = tentativi.get(email);
  if (t && Date.now() - t.dal < FINESTRA && t.n >= 5) return { errore: "Troppi tentativi. Riprova tra qualche minuto.", email };

  const u = await db.query.users.findFirst({ where: eq(users.email, email) });
  const ok = u && u.active && (await bcrypt.compare(password, u.passwordHash));
  if (!ok) {
    const cur = t && Date.now() - t.dal < FINESTRA ? t : { n: 0, dal: Date.now() };
    tentativi.set(email, { n: cur.n + 1, dal: cur.dal });
    return { errore: "Email o password non corretti.", email };
  }
  tentativi.delete(email);
  await createSession(u);
  await audit(u, "login", "utente", u.id);
  // Solo percorsi interni: niente redirect verso siti esterni.
  redirect(da && /^\/(?!\/)/.test(da) ? da : "/dashboard");
}

export async function logout() {
  const u = await currentUser();
  if (u) await audit(u, "logout", "utente", u.id);
  await destroySession();
  redirect("/login");
}
