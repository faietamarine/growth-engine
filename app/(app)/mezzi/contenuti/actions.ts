"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import type { FormState } from "@/components/ui/action-form";
import { controllaPost, eventoSchema, postSchema } from "@/lib/vetrina/contenuti";
import { aggiornaEvento, aggiornaPost, caricaArticoliIniziali, creaEvento, creaPost, eliminaEvento, eliminaPost } from "@/features/vetrina/contenuti";

const uuid = z.string().uuid();

function rinfresca() {
  revalidatePath("/mezzi/blog");
  revalidatePath("/mezzi/eventi");
  revalidatePath("/vetrina", "layout");
  revalidatePath("/sitemap.xml");
}

/* ---------- Blog ---------- */
export async function salvaPostAction(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("contenuti:scrivi");
  const p = postSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  const err = controllaPost(p.data);
  if (err) return { errore: err };
  if (id) {
    if (!uuid.safeParse(id).success) return { errore: "Articolo non valido." };
    await aggiornaPost(id, p.data, user);
  } else id = await creaPost(p.data, user);
  rinfresca();
  redirect(`/mezzi/blog?msg=${encodeURIComponent(p.data.stato === "PUBBLICATO" ? "Articolo salvato: è online sul sito." : "Articolo salvato come bozza (non visibile sul sito).")}`);
}

export async function eliminaPostAction(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  await eliminaPost(uuid.parse(form.get("id")), user);
  rinfresca();
  redirect("/mezzi/blog?msg=Articolo%20eliminato.");
}

export async function caricaArticoliInizialiAction() {
  const user = await requireUser("contenuti:scrivi");
  const n = await caricaArticoliIniziali(user);
  rinfresca();
  redirect(`/mezzi/blog?msg=${encodeURIComponent(n ? `Caricati ${n} articoli in bozza: rileggili, aggiungi una foto e pubblicali.` : "Gli articoli di partenza sono già presenti.")}`);
}

/* ---------- Eventi e prove in mare ---------- */
export async function salvaEventoAction(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("contenuti:scrivi");
  const p = eventoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  if (id) {
    if (!uuid.safeParse(id).success) return { errore: "Evento non valido." };
    await aggiornaEvento(id, p.data, user);
  } else await creaEvento(p.data, user);
  rinfresca();
  redirect(`/mezzi/eventi?msg=${encodeURIComponent(p.data.stato === "PUBBLICATO" ? "Evento salvato: è online sul sito." : "Evento salvato come bozza (non visibile sul sito).")}`);
}

export async function eliminaEventoAction(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  await eliminaEvento(uuid.parse(form.get("id")), user);
  rinfresca();
  redirect("/mezzi/eventi?msg=Evento%20eliminato.");
}
