"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns, WORK_STATUS } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { generateLeadMagnet, lmContentSchema } from "@/lib/leadmagnets/generate";
import { getLmTipo } from "@/lib/leadmagnets/catalog";
import { rewriteLeadMagnet } from "@/lib/ai/lm-copywriter";
import type { LeadMagnetContent } from "@/types/lead-magnet";
import { changeLeadMagnetStatus, createLeadMagnet, deleteLeadMagnet, duplicateLeadMagnet, toggleChecklist, updateLeadMagnet } from "@/features/lead-magnets/service";

const uuid = z.string().uuid();
const campagnaOpz = z.union([z.literal(""), z.null(), z.string().uuid()]).transform((v) => v || null);

export type GenLmState = { ok: true; title: string; content: LeadMagnetContent; provider: "mock" | "anthropic"; nota?: string } | { ok: false; errore: string };

const genSchema = z.object({
  tipo: z.string().refine((k) => !!getLmTipo(k), "Scegli un tipo di lead magnet"),
  tema: z.string().trim().max(120).optional(),
  campaignId: campagnaOpz,
});

/** Genera la bozza (non salva). Con una campagna collegata usa il suo soggetto e il suo contesto. */
export async function generaLeadMagnet(raw: unknown): Promise<GenLmState> {
  await requireUser("contenuti:scrivi");
  const p = genSchema.safeParse(raw);
  if (!p.success) return { ok: false, errore: p.error.issues[0].message };
  const camp = p.data.campaignId ? await db.query.campaigns.findFirst({ where: eq(campaigns.id, p.data.campaignId) }) : null;
  const g = generateLeadMagnet({ tipo: p.data.tipo, tema: p.data.tema, soggettoCampagna: camp?.plan.soggetto });
  const contesto = camp ? `Campagna «${camp.name}». Obiettivo: ${camp.objective}. Promessa: ${camp.plan.promessa}.` : (p.data.tema ?? "");
  const r = await rewriteLeadMagnet(g.content, contesto);
  return { ok: true, title: r.content.titolo.slice(0, 160), content: r.content, provider: r.provider, nota: r.nota };
}

export type SaveLmState = { ok: false; errore: string } | undefined;

const saveSchema = z.object({ title: z.string().trim().min(3, "Il titolo è troppo corto").max(160), campaignId: campagnaOpz, content: lmContentSchema });

export async function salvaLeadMagnet(raw: unknown): Promise<SaveLmState> {
  const user = await requireUser("contenuti:scrivi");
  const p = saveSchema.safeParse(raw);
  if (!p.success) return { ok: false, errore: p.error.issues[0].message };
  let id: string;
  try {
    id = await createLeadMagnet(p.data, user);
  } catch (e) {
    return { ok: false, errore: (e as Error).message };
  }
  revalidatePath("/lead-magnet");
  if (p.data.campaignId) revalidatePath(`/campagne/${p.data.campaignId}`);
  redirect(`/lead-magnet/${id}?msg=${encodeURIComponent("Lead magnet salvato in bozza.")}`);
}

export async function modificaLeadMagnet(id: string, raw: unknown): Promise<{ ok: boolean; msg: string }> {
  const user = await requireUser("contenuti:scrivi");
  const lid = uuid.safeParse(id);
  const p = saveSchema.safeParse(raw);
  if (!lid.success) return { ok: false, msg: "Lead magnet non valido." };
  if (!p.success) return { ok: false, msg: p.error.issues[0].message };
  try {
    const msg = await updateLeadMagnet(lid.data, p.data, user);
    revalidatePath(`/lead-magnet/${lid.data}`);
    revalidatePath("/lead-magnet");
    return { ok: true, msg };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

export async function spuntaChecklist(id: string, index: number, fatto: boolean): Promise<{ ok: boolean; msg?: string }> {
  const user = await requireUser("contenuti:scrivi");
  try {
    await toggleChecklist(uuid.parse(id), z.number().int().min(0).parse(index), fatto === true, user);
    revalidatePath(`/lead-magnet/${id}`);
    revalidatePath("/lead-magnet");
    return { ok: true };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

export async function cambiaStatoLm(form: FormData) {
  const user = await requireUser();
  const id = uuid.parse(form.get("id"));
  try {
    await changeLeadMagnetStatus(id, z.enum(WORK_STATUS).parse(form.get("to")), user);
  } catch (e) {
    // Errori di regola (es. checklist incompleta): si mostrano in pagina, non come errore generico.
    redirect(`/lead-magnet/${id}?errore=${encodeURIComponent((e as Error).message)}`);
  }
  revalidatePath(`/lead-magnet/${id}`);
  revalidatePath("/lead-magnet");
}

export async function duplicaLm(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  const nuovo = await duplicateLeadMagnet(uuid.parse(form.get("id")), user);
  revalidatePath("/lead-magnet");
  redirect(`/lead-magnet/${nuovo}?msg=${encodeURIComponent("Copia creata in bozza.")}`);
}

export async function eliminaLm(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  await deleteLeadMagnet(uuid.parse(form.get("id")), user);
  revalidatePath("/lead-magnet");
  redirect(`/lead-magnet?msg=${encodeURIComponent("Lead magnet eliminato.")}`);
}
