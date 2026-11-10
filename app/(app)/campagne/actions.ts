"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { generateCampaign, type GeneratedCampaign } from "@/lib/campaigns/generate";
import { writeCopy } from "@/lib/ai/copywriter";
import { generateInputSchema, saveCampaignSchema, righe } from "@/lib/campaigns/validation";
import { dataItalia } from "@/lib/crm/nautilus";
import { WORK_STATUS, REPARTI } from "@/db/schema";
import { changeStatus, createCampaign, createTasksFromPlan, deleteCampaign, duplicateCampaign, updateCampaign } from "@/features/campaigns/service";

export type GenerateState =
  | { ok: true; campaign: GeneratedCampaign; provider: "mock" | "anthropic"; nota?: string }
  | { ok: false; errore: string; campi?: Record<string, string> };

/** Passo 1 → 2: genera il piano (non salva nulla). */
export async function generaPiano(raw: unknown): Promise<GenerateState> {
  await requireUser("campagne:scrivi");
  const p = generateInputSchema.safeParse(raw);
  if (!p.success) {
    return { ok: false, errore: "Controlla i campi evidenziati.", campi: Object.fromEntries(p.error.issues.map((i) => [i.path.join("."), i.message])) };
  }
  const gen = generateCampaign({ ...p.data, oggi: dataItalia(new Date()) });
  const r = await writeCopy(gen, p.data.dettagli);
  return { ok: true, campaign: r.campaign, provider: r.provider, nota: r.nota };
}

export type SaveState = { ok: false; errore: string } | undefined;

/** Passo 2: salva la campagna come bozza e apre la scheda. */
export async function salvaBozza(raw: unknown): Promise<SaveState> {
  const user = await requireUser("campagne:scrivi");
  const p = saveCampaignSchema.safeParse(raw);
  if (!p.success) return { ok: false, errore: `Dati non validi: ${p.error.issues[0]?.path.join(".")} — ${p.error.issues[0]?.message}` };
  let id: string;
  try {
    id = await createCampaign(p.data, user);
  } catch (e) {
    return { ok: false, errore: (e as Error).message };
  }
  revalidatePath("/campagne");
  revalidatePath("/dashboard");
  redirect(`/campagne/${id}?nuova=1`);
}

const idSchema = z.string().uuid();

export async function cambiaStato(form: FormData) {
  const user = await requireUser();
  const id = idSchema.parse(form.get("id"));
  const to = z.enum(WORK_STATUS).parse(form.get("to"));
  await changeStatus(id, to, user);
  revalidatePath(`/campagne/${id}`);
  revalidatePath("/campagne");
  revalidatePath("/dashboard");
}

export async function creaAttivita(form: FormData) {
  const user = await requireUser("campagne:scrivi");
  const id = idSchema.parse(form.get("id"));
  const n = await createTasksFromPlan(id, user);
  revalidatePath(`/campagne/${id}`);
  revalidatePath("/dashboard");
  redirect(`/campagne/${id}?msg=${encodeURIComponent(`${n} attività aggiunte al calendario di produzione.`)}`);
}

export async function duplica(form: FormData) {
  const user = await requireUser("campagne:scrivi");
  const nuovo = await duplicateCampaign(idSchema.parse(form.get("id")), user);
  revalidatePath("/campagne");
  redirect(`/campagne/${nuovo}?msg=${encodeURIComponent("Copia creata in bozza.")}`);
}

export async function elimina(form: FormData) {
  const user = await requireUser("impostazioni:gestisci"); // solo Admin
  await deleteCampaign(idSchema.parse(form.get("id")), user);
  revalidatePath("/campagne");
  revalidatePath("/dashboard");
  redirect(`/campagne?msg=${encodeURIComponent("Campagna eliminata.")}`);
}

export type EditState = { ok: boolean; msg: string } | undefined;

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : Number(v));

const editSchema = z.object({
  name: z.string().trim().min(5, "Nome troppo corto").max(120).optional(),
  objective: z.string().trim().min(10, "Obiettivo troppo corto").max(400).optional(),
  reparto: z.enum(REPARTI).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  budget: z.number().min(0).max(500_000).optional(),
  spent: z.number().min(0, "La spesa non può essere negativa").max(500_000).optional(),
  leadTarget: z.number().int().min(0).max(10_000).optional(),
  plan: z
    .object({
      angolo: z.string().max(500),
      promessa: z.string().max(400),
      offerta: z.string().max(400),
      cta: z.string().max(80),
      hook: z.array(z.string().max(200)).max(8),
      painPoint: z.array(z.string().max(300)).max(10),
      desideri: z.array(z.string().max(300)).max(10),
      obiezioni: z.array(z.object({ obiezione: z.string().max(200), risposta: z.string().max(400) })).max(10),
      asset: z.array(z.string().max(200)).max(20),
      metriche: z.array(z.string().max(200)).max(20),
      qualificazione: z.array(z.string().max(200)).max(12),
      audience: z.array(z.object({ nome: z.string().max(80), descrizione: z.string().max(300) })).max(8),
    })
    .partial()
    .optional(),
});

/** Modifica dalla scheda campagna. I campi assenti dal form (per lo stato attuale) non vengono toccati. */
export async function salvaModifiche(_: EditState, form: FormData): Promise<EditState> {
  const user = await requireUser("campagne:scrivi");
  const id = idSchema.parse(form.get("id"));
  const has = (k: string) => form.has(k);
  const coppie = (k: string, sep: string) =>
    righe(form.get(k)).map((r) => {
      const [a, ...b] = r.split(sep);
      return [a.trim(), b.join(sep).trim()] as const;
    });
  const raw = {
    name: has("name") ? String(form.get("name")) : undefined,
    objective: has("objective") ? String(form.get("objective")) : undefined,
    reparto: has("reparto") ? String(form.get("reparto")) : undefined,
    startDate: has("startDate") ? String(form.get("startDate")) : undefined,
    endDate: has("endDate") ? String(form.get("endDate")) : undefined,
    budget: num(form.get("budget")),
    spent: num(form.get("spent")),
    leadTarget: num(form.get("leadTarget")),
    plan: has("angolo")
      ? {
          angolo: String(form.get("angolo")).trim(),
          promessa: String(form.get("promessa")).trim(),
          offerta: String(form.get("offerta")).trim(),
          cta: String(form.get("cta")).trim(),
          hook: righe(form.get("hook")),
          painPoint: righe(form.get("painPoint")),
          desideri: righe(form.get("desideri")),
          obiezioni: coppie("obiezioni", "|").map(([obiezione, risposta]) => ({ obiezione, risposta })),
          asset: righe(form.get("asset")),
          metriche: righe(form.get("metriche")),
          qualificazione: righe(form.get("qualificazione")),
          audience: coppie("audience", ":").map(([nome, descrizione]) => ({ nome, descrizione })),
        }
      : undefined,
  };
  const p = editSchema.safeParse(raw);
  if (!p.success) return { ok: false, msg: p.error.issues[0]?.message ?? "Dati non validi." };
  try {
    const msg = await updateCampaign(id, p.data, user);
    revalidatePath(`/campagne/${id}`);
    revalidatePath("/campagne");
    revalidatePath("/dashboard");
    return { ok: true, msg };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}
