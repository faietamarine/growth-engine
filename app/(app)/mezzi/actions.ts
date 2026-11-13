"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import type { FormState } from "@/components/ui/action-form";
import { controllaMezzo, mezzoSchema, STATI_MEZZO } from "@/lib/vetrina/catalog";
import { aggiornaMezzo, cambiaStatoMezzo, creaMezzo, eliminaMezzo, saveVetrinaSettings } from "@/features/vetrina/service";

const uuid = z.string().uuid();
const vai = (id: string, k: "msg" | "errore", m: string) => `/mezzi/${id}?${k}=${encodeURIComponent(m)}`;

/** Aggiorna le pagine pubbliche toccate da una modifica agli annunci. */
function rinfresca(id?: string) {
  revalidatePath("/mezzi");
  revalidatePath("/vetrina", "layout");
  if (id) revalidatePath(`/mezzi/${id}`);
}

export async function creaMezzoAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("contenuti:scrivi");
  const p = mezzoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  const err = controllaMezzo(p.data);
  if (err) return { errore: err };
  const id = await creaMezzo(p.data, user);
  rinfresca();
  redirect(vai(id, "msg", p.data.stato === "PUBBLICATO" ? "Mezzo creato e online sul sito." : "Mezzo salvato come bozza."));
}

export async function salvaMezzoAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("contenuti:scrivi");
  if (!uuid.safeParse(id).success) return { errore: "Mezzo non valido." };
  const p = mezzoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  const err = controllaMezzo(p.data);
  if (err) return { errore: err };
  try {
    await aggiornaMezzo(id, p.data, user);
  } catch (e) {
    return { errore: (e as Error).message };
  }
  rinfresca(id);
  redirect(vai(id, "msg", "Modifiche salvate."));
}

export async function statoMezzoAction(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  const id = uuid.parse(form.get("id"));
  const to = z.enum(STATI_MEZZO).parse(form.get("to"));
  try {
    await cambiaStatoMezzo(id, to, user);
  } catch (e) {
    redirect(`/mezzi?errore=${encodeURIComponent((e as Error).message)}`);
  }
  rinfresca(id);
  redirect(`/mezzi?msg=${encodeURIComponent(to === "PUBBLICATO" ? "Mezzo online sul sito." : to === "VENDUTO" ? "Segnato come venduto." : "Mezzo tolto dal sito.")}`);
}

export async function eliminaMezzoAction(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  await eliminaMezzo(uuid.parse(form.get("id")), user);
  rinfresca();
  redirect("/mezzi?msg=Mezzo%20eliminato.");
}

const sitoSchema = z.object({
  bannerId: z.preprocess((v) => {
    try {
      const a = JSON.parse(String(v ?? "[]"));
      return Array.isArray(a) ? (a[0] ?? "") : "";
    } catch {
      return "";
    }
  }, z.union([z.literal(""), z.string().uuid()])),
  telefono: z.string().trim().min(6, "Inserisci il telefono").max(25),
  email: z.string().trim().email("Email non valida").max(120),
  indirizzo: z.string().trim().min(5, "Inserisci l'indirizzo").max(160),
  whatsapp: z.string().trim().max(25).default(""),
});

export async function salvaSitoAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("contenuti:scrivi");
  const p = sitoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  await saveVetrinaSettings(p.data, user);
  revalidatePath("/vetrina", "layout");
  return { ok: "Dati del sito salvati." };
}

/* ---------- Avvisi e promo ---------- */
import { promoSchema } from "@/lib/vetrina/promo";
import { aggiornaPromo, creaPromo, eliminaPromo } from "@/features/vetrina/service";

export async function creaPromoAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("contenuti:scrivi");
  const p = promoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  await creaPromo(p.data, user);
  revalidatePath("/mezzi/avvisi");
  revalidatePath("/vetrina", "layout");
  return { ok: "Avviso salvato." };
}

export async function salvaPromoAction(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("contenuti:scrivi");
  if (!uuid.safeParse(id).success) return { errore: "Avviso non valido." };
  const p = promoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  await aggiornaPromo(id, p.data, user);
  revalidatePath("/mezzi/avvisi");
  revalidatePath("/vetrina", "layout");
  return { ok: "Avviso aggiornato." };
}

export async function eliminaPromoAction(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  await eliminaPromo(uuid.parse(form.get("id")), user);
  revalidatePath("/mezzi/avvisi");
  revalidatePath("/vetrina", "layout");
  redirect("/mezzi/avvisi");
}
