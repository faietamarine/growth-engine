"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { TASK_STATUS } from "@/db/schema";
import { attivitaSchema } from "@/lib/calendar/logic";
import type { FormState } from "@/components/ui/action-form";
import { createTask, deleteTask, setTaskStatus, updateTask } from "@/features/calendar/service";

const uuid = z.string().uuid();
/** Torna alla vista da cui si è partiti (solo percorsi interni del calendario). */
const ritorno = (v: FormDataEntryValue | null) => (typeof v === "string" && /^\/calendario(\?[\w=&%.-]*)?$/.test(v) ? v : "/calendario?vista=elenco");
const conMsg = (path: string, k: "msg" | "errore", m: string) => `${path}${path.includes("?") ? "&" : "?"}${k}=${encodeURIComponent(m)}`;

export async function creaAttivita(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const p = attivitaSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  try {
    await createTask(p.data, user);
  } catch (e) {
    return { errore: (e as Error).message };
  }
  revalidatePath("/calendario");
  redirect(conMsg(ritorno(form.get("ritorno")), "msg", "Attività aggiunta."));
}

export async function salvaAttivita(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!uuid.safeParse(id).success) return { errore: "Attività non valida." };
  const p = attivitaSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  try {
    await updateTask(id, p.data, user);
  } catch (e) {
    return { errore: (e as Error).message };
  }
  revalidatePath("/calendario");
  redirect(conMsg(ritorno(form.get("ritorno")), "msg", "Attività salvata."));
}

export async function statoAttivita(form: FormData) {
  const user = await requireUser();
  const id = uuid.parse(form.get("id"));
  const to = z.enum(TASK_STATUS).parse(form.get("to"));
  const back = ritorno(form.get("ritorno"));
  try {
    await setTaskStatus(id, to, user);
  } catch (e) {
    redirect(conMsg(back, "errore", (e as Error).message));
  }
  revalidatePath("/calendario");
  redirect(back);
}

export async function eliminaAttivita(form: FormData) {
  const user = await requireUser();
  const id = uuid.parse(form.get("id"));
  await deleteTask(id, user);
  revalidatePath("/calendario");
  redirect(conMsg("/calendario?vista=elenco", "msg", "Attività eliminata."));
}
