"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { settingsSchema } from "@/lib/settings/validation";
import { saveSiteSettings } from "@/features/settings/service";
import { CONFERMA_RESET_DEMO, svuotaDatiDemo } from "@/features/settings/reset-demo";

export type SettingsState = { ok: boolean; msg: string } | undefined;

export async function eliminaDatiDemo(_: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await requireUser("impostazioni:gestisci");
  if (String(form.get("conferma") ?? "").trim() !== CONFERMA_RESET_DEMO) {
    return { ok: false, msg: `Per confermare scrivi esattamente: ${CONFERMA_RESET_DEMO}` };
  }
  try {
    await svuotaDatiDemo(user);
  } catch (e) {
    console.error("Reset dati demo non riuscito:", e);
    return { ok: false, msg: "Non sono riuscito a eliminare i dati. Nulla è stato cancellato. Riprova o avvisami." };
  }
  revalidatePath("/", "layout");
  return { ok: true, msg: "Dati demo eliminati. Restano il tuo account Admin e le impostazioni dell'azienda." };
}

export async function salvaImpostazioni(_: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await requireUser("impostazioni:gestisci");
  const p = settingsSchema.safeParse(Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])));
  if (!p.success) return { ok: false, msg: p.error.issues[0].message };
  const s = await saveSiteSettings(p.data, user);
  revalidatePath("/impostazioni");
  return { ok: true, msg: `Impostazioni salvate. Versione informativa: ${s.versioneInformativa}.` };
}
