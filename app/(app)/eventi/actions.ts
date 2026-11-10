"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { WORK_STATUS } from "@/db/schema";
import { eventoSchema } from "@/lib/events/logic";
import { leadInputSchema } from "@/lib/leads/validation";
import { getSiteSettings } from "@/features/settings/service";
import type { FormState } from "@/components/ui/action-form";
import {
  changeEventStatus,
  createEvent,
  createOnSiteLead,
  createRegistrationLanding,
  deleteEvent,
  scheduleEventTasks,
  setCheckIn,
  toggleChecklist,
  updateEvent,
} from "@/features/events/service";

const uuid = z.string().uuid();
const msg = (path: string, m: string) => `${path}?msg=${encodeURIComponent(m)}`;
const err = (path: string, m: string) => `${path}?errore=${encodeURIComponent(m)}`;

export async function creaEvento(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("eventi:scrivi");
  const p = eventoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  const id = await createEvent(p.data, user);
  revalidatePath("/eventi");
  redirect(msg(`/eventi/${id}`, "Evento creato in bozza. Ora prepara la pagina di iscrizione e la checklist."));
}

export async function salvaEvento(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("eventi:scrivi");
  if (!uuid.safeParse(id).success) return { errore: "Evento non valido." };
  const p = eventoSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  let m: string;
  try {
    m = await updateEvent(id, p.data, user);
  } catch (e) {
    return { errore: (e as Error).message };
  }
  revalidatePath(`/eventi/${id}`);
  revalidatePath("/eventi");
  redirect(msg(`/eventi/${id}`, m));
}

export async function cambiaStatoEvento(form: FormData) {
  const user = await requireUser("eventi:scrivi");
  const id = uuid.parse(form.get("id"));
  const to = z.enum(WORK_STATUS).parse(form.get("to"));
  try {
    await changeEventStatus(id, to, user);
  } catch (e) {
    redirect(err(`/eventi/${id}`, (e as Error).message));
  }
  revalidatePath(`/eventi/${id}`);
  revalidatePath("/eventi");
  revalidatePath("/landing");
  redirect(msg(`/eventi/${id}`, "Stato aggiornato."));
}

export async function spuntaVoce(form: FormData) {
  const user = await requireUser("eventi:scrivi");
  const id = uuid.parse(form.get("id"));
  const voce = z.string().min(1).max(200).parse(form.get("voce"));
  await toggleChecklist(id, voce, form.get("fatto") === "1", user);
  revalidatePath(`/eventi/${id}`);
}

export async function creaPaginaIscrizione(form: FormData) {
  const user = await requireUser("eventi:scrivi");
  const id = uuid.parse(form.get("id"));
  const landingId = await createRegistrationLanding(id, user);
  revalidatePath(`/eventi/${id}`);
  revalidatePath("/landing");
  redirect(`/landing/${landingId}/modifica`);
}

export async function checkIn(form: FormData) {
  const user = await requireUser("eventi:scrivi");
  const id = uuid.parse(form.get("id"));
  const leadId = uuid.parse(form.get("leadId"));
  await setCheckIn(id, leadId, form.get("presente") === "1", user);
  revalidatePath(`/eventi/${id}`);
}

export async function mettiInCalendario(form: FormData) {
  const user = await requireUser("eventi:scrivi");
  const id = uuid.parse(form.get("id"));
  let n = 0;
  try {
    n = await scheduleEventTasks(id, user);
  } catch (e) {
    redirect(err(`/eventi/${id}`, (e as Error).message));
  }
  revalidatePath(`/eventi/${id}`);
  revalidatePath("/calendario");
  redirect(msg(`/eventi/${id}`, `${n} attività aggiunte al calendario di produzione.`));
}

export async function eliminaEvento(form: FormData) {
  const user = await requireUser("eventi:scrivi");
  const id = uuid.parse(form.get("id"));
  try {
    await deleteEvent(id, user);
  } catch (e) {
    redirect(err(`/eventi/${id}`, (e as Error).message));
  }
  revalidatePath("/eventi");
  redirect(msg("/eventi", "Evento eliminato."));
}

/** Raccolta sul posto (tablet dello staff). Il form resta aperto per il contatto successivo. */
export async function raccogliContatto(eventId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("eventi:scrivi");
  if (!uuid.safeParse(eventId).success) return { errore: "Evento non valido." };
  const v = (k: string) => String(form.get(k) ?? "");
  const nomeCompleto = v("nome").trim();
  const [nome, ...resto] = nomeCompleto.split(/\s+/);
  const sito = await getSiteSettings();
  const p = leadInputSchema.safeParse({
    nome: v("cognome") ? nomeCompleto : nome,
    cognome: v("cognome") || resto.join(" "),
    azienda: v("azienda"),
    telefono: v("telefono"),
    email: v("email"),
    interesse: v("interesse"),
    budgetFascia: v("budgetFascia"),
    tempistica: v("tempistica"),
    zona: v("zona"),
    messaggio: v("messaggio"),
    consensoPrivacy: form.get("consensoPrivacy") === "on",
    consensoMarketing: form.get("consensoMarketing") === "on",
    versioneInformativa: sito.versioneInformativa,
  });
  if (!p.success) return { errore: p.error.issues[0].message };
  try {
    const r = await createOnSiteLead(eventId, p.data, user);
    revalidatePath(`/eventi/${eventId}`);
    revalidatePath("/lead");
    return { ok: `Contatto salvato: ${p.data.nome} ${p.data.cognome}`.trim() + (r.status === "QUALIFICATO" ? " · qualificato, andrà al CRM." : " · da completare (punteggio basso).") };
  } catch (e) {
    return { errore: (e as Error).message };
  }
}
