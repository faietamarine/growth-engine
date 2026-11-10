"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { ASSET_STATUS } from "@/db/schema";
import { assetSchema } from "@/lib/assets/catalog";
import type { FormState } from "@/components/ui/action-form";
import { changeAssetStatus, createAsset, deleteAsset, newVersion, updateAsset } from "@/features/assets/service";

const uuid = z.string().uuid();
const vai = (id: string, k: "msg" | "errore", m: string) => `/asset/${id}?${k}=${encodeURIComponent(m)}`;

export async function creaAsset(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("contenuti:scrivi");
  const p = assetSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  const id = await createAsset(p.data, user);
  revalidatePath("/asset");
  redirect(vai(id, "msg", "Asset creato come idea."));
}

export async function salvaAsset(id: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("contenuti:scrivi");
  if (!uuid.safeParse(id).success) return { errore: "Asset non valido." };
  const p = assetSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  let m: string;
  try {
    m = await updateAsset(id, p.data, user);
  } catch (e) {
    return { errore: (e as Error).message };
  }
  revalidatePath("/asset");
  revalidatePath(`/asset/${id}`);
  redirect(vai(id, "msg", m));
}

export async function statoAsset(form: FormData) {
  const user = await requireUser();
  const id = uuid.parse(form.get("id"));
  const to = z.enum(ASSET_STATUS).parse(form.get("to"));
  const back = form.get("ritorno") === "bacheca" ? "/asset?vista=bacheca" : null;
  try {
    await changeAssetStatus(id, to, user);
  } catch (e) {
    redirect(back ? `${back}&errore=${encodeURIComponent((e as Error).message)}` : vai(id, "errore", (e as Error).message));
  }
  revalidatePath("/asset");
  revalidatePath(`/asset/${id}`);
  redirect(back ?? vai(id, "msg", "Stato aggiornato."));
}

export async function nuovaVersione(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  const id = uuid.parse(form.get("id"));
  const nuovo = await newVersion(id, user);
  revalidatePath("/asset");
  redirect(vai(nuovo, "msg", "Nuova versione creata in bozza: la precedente resta nello storico."));
}

export async function eliminaAsset(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  const id = uuid.parse(form.get("id"));
  try {
    await deleteAsset(id, user);
  } catch (e) {
    redirect(vai(id, "errore", (e as Error).message));
  }
  revalidatePath("/asset");
  redirect("/asset?msg=" + encodeURIComponent("Asset eliminato."));
}
