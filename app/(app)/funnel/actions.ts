"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { WORK_STATUS } from "@/db/schema";
import { funnelSchema } from "@/lib/funnels/validation";
import { changeFunnelStatus, createFromTemplate, deleteFunnel, duplicateFunnel, updateFunnel } from "@/features/funnels/service";

const id = z.string().uuid();

export type CreateState = { errore: string } | undefined;

const createSchema = z.object({
  key: z.string().min(2).max(40),
  name: z.string().trim().min(3, "Il nome deve avere almeno 3 caratteri").max(120),
  campaignId: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null),
});

export async function creaDaModello(_: CreateState, form: FormData): Promise<CreateState> {
  const user = await requireUser("funnel:scrivi");
  const p = createSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  let nuovo: string;
  try {
    nuovo = await createFromTemplate(p.data.key, { name: p.data.name, campaignId: p.data.campaignId }, user);
  } catch (e) {
    return { errore: (e as Error).message };
  }
  revalidatePath("/funnel");
  if (p.data.campaignId) revalidatePath(`/campagne/${p.data.campaignId}`);
  redirect(`/funnel/${nuovo}?msg=${encodeURIComponent("Funnel creato in bozza dal modello.")}`);
}

/** Dalla scheda campagna: crea il funnel consigliato con un clic. */
export async function creaConsigliato(form: FormData) {
  const user = await requireUser("funnel:scrivi");
  const campaignId = id.parse(form.get("campaignId"));
  const key = z.string().min(2).max(40).parse(form.get("key"));
  const name = z.string().trim().min(3).max(120).parse(form.get("name"));
  const nuovo = await createFromTemplate(key, { name, campaignId }, user);
  revalidatePath(`/campagne/${campaignId}`);
  revalidatePath("/funnel");
  redirect(`/funnel/${nuovo}?msg=${encodeURIComponent("Funnel creato e collegato alla campagna.")}`);
}

export type SaveFunnelState = { ok: boolean; msg: string };

export async function salvaFunnel(funnelId: string, raw: unknown): Promise<SaveFunnelState> {
  const user = await requireUser("funnel:scrivi");
  const fid = id.safeParse(funnelId);
  if (!fid.success) return { ok: false, msg: "Funnel non valido." };
  const p = funnelSchema.safeParse(raw);
  if (!p.success) return { ok: false, msg: p.error.issues[0]?.message ?? "Dati non validi." };
  try {
    const msg = await updateFunnel(fid.data, p.data, user);
    revalidatePath(`/funnel/${fid.data}`);
    revalidatePath("/funnel");
    return { ok: true, msg };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

export async function cambiaStatoFunnel(form: FormData) {
  const user = await requireUser();
  const fid = id.parse(form.get("id"));
  await changeFunnelStatus(fid, z.enum(WORK_STATUS).parse(form.get("to")), user);
  revalidatePath(`/funnel/${fid}`);
  revalidatePath("/funnel");
}

export async function duplicaFunnel(form: FormData) {
  const user = await requireUser("funnel:scrivi");
  const nuovo = await duplicateFunnel(id.parse(form.get("id")), user);
  revalidatePath("/funnel");
  redirect(`/funnel/${nuovo}?msg=${encodeURIComponent("Copia creata in bozza: puoi modificarla.")}`);
}

export async function eliminaFunnel(form: FormData) {
  const user = await requireUser("funnel:scrivi");
  await deleteFunnel(id.parse(form.get("id")), user);
  revalidatePath("/funnel");
  redirect(`/funnel?vista=miei&msg=${encodeURIComponent("Funnel eliminato.")}`);
}
