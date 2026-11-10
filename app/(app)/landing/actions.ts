"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { WORK_STATUS } from "@/db/schema";
import { slugify } from "@/lib/campaigns/generate";
import { blocchiSchema } from "@/lib/landing/blocks";
import { applyWinnerB, changeLandingStatus, createLanding, deleteLanding, republish, saveDraft, setAbTest } from "@/features/landing/service";

const uuid = z.string().uuid();
const opz = z.union([z.literal(""), z.null(), z.string().uuid()]).transform((v) => v || null);

export type CreaLandingState = { errore: string } | undefined;

export async function creaLanding(_: CreaLandingState, form: FormData): Promise<CreaLandingState> {
  const user = await requireUser("contenuti:scrivi");
  const p = z
    .object({ title: z.string().trim().min(3, "Il titolo deve avere almeno 3 caratteri").max(120), funnelId: opz, leadMagnetId: opz, campaignId: opz })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { errore: p.error.issues[0].message };
  let id: string;
  try {
    id = await createLanding(p.data, user);
  } catch (e) {
    return { errore: (e as Error).message };
  }
  revalidatePath("/landing");
  redirect(`/landing/${id}/modifica`);
}

export async function salvaBozzaLanding(id: string, raw: unknown): Promise<{ ok: boolean; msg: string; slug?: string }> {
  const user = await requireUser("contenuti:scrivi");
  const p = z
    .object({ title: z.string().trim().min(3, "Il titolo è troppo corto").max(120), slug: z.string().trim().min(3).max(60).transform((s) => slugify(s, 50)), blocks: blocchiSchema })
    .safeParse(raw);
  if (!uuid.safeParse(id).success) return { ok: false, msg: "Pagina non valida." };
  if (!p.success) return { ok: false, msg: p.error.issues[0]?.message ?? "Dati non validi." };
  if (!p.data.slug) return { ok: false, msg: "L'indirizzo deve contenere lettere o numeri." };
  try {
    const r = await saveDraft(id, p.data, user);
    revalidatePath(`/landing/${id}`);
    revalidatePath("/landing");
    return { ok: true, msg: r.msg, slug: r.slug };
  } catch (e) {
    return { ok: false, msg: (e as Error).message };
  }
}

/** Esegue un'azione e torna alla scheda con l'esito (gli errori di regola si mostrano in pagina). */
async function esegui(id: string, fn: () => Promise<unknown>, ok: string) {
  try {
    await fn();
  } catch (e) {
    redirect(`/landing/${id}?errore=${encodeURIComponent((e as Error).message.slice(0, 300))}`);
  }
  revalidatePath(`/landing/${id}`);
  revalidatePath("/landing");
  redirect(`/landing/${id}?msg=${encodeURIComponent(ok)}`);
}

export async function cambiaStatoLanding(form: FormData) {
  const user = await requireUser();
  const id = uuid.parse(form.get("id"));
  const to = z.enum(WORK_STATUS).parse(form.get("to"));
  await esegui(id, () => changeLandingStatus(id, to, user), to === "PUBBLICATO" ? "Pagina online." : "Stato aggiornato.");
}

export async function ripubblica(form: FormData) {
  const user = await requireUser("landing:pubblica");
  const id = uuid.parse(form.get("id"));
  await esegui(id, () => republish(id, user), "Modifiche pubblicate: la pagina online è aggiornata.");
}

const abSchema = z.object({
  id: z.string().uuid(),
  elemento: z.enum(["headline", "cta", "immagine", "offerta"]),
  valoreB: z.string().trim().min(2, "Scrivi la variante B").max(300),
});

export async function avviaAb(form: FormData) {
  const user = await requireUser("landing:pubblica");
  const p = abSchema.safeParse(Object.fromEntries(form));
  const id = uuid.parse(form.get("id"));
  if (!p.success) redirect(`/landing/${id}?errore=${encodeURIComponent(p.error.issues[0].message)}`);
  if (p.data.elemento === "immagine" && !/^https:\/\/[^\s"'<>]+$/i.test(p.data.valoreB)) redirect(`/landing/${id}?errore=${encodeURIComponent("Per l'immagine serve un indirizzo che inizia con https://")}`);
  await esegui(id, () => setAbTest(id, { attivo: true, elemento: p.data.elemento, valoreB: p.data.valoreB, iniziatoIl: new Date().toISOString() }, user), "Test A/B avviato: metà dei visitatori vede la variante B. I contatori ripartono da zero.");
}

export async function fermaAb(form: FormData) {
  const user = await requireUser("landing:pubblica");
  const id = uuid.parse(form.get("id"));
  await esegui(id, () => setAbTest(id, null, user), "Test fermato: tutti vedono di nuovo la versione A.");
}

export async function applicaB(form: FormData) {
  const user = await requireUser("landing:pubblica");
  const id = uuid.parse(form.get("id"));
  await esegui(id, () => applyWinnerB(id, user), "Variante B applicata alla pagina e test chiuso.");
}

export async function eliminaLanding(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  const id = uuid.parse(form.get("id"));
  try {
    await deleteLanding(id, user);
  } catch (e) {
    redirect(`/landing/${id}?errore=${encodeURIComponent((e as Error).message)}`);
  }
  revalidatePath("/landing");
  redirect(`/landing?msg=${encodeURIComponent("Pagina eliminata.")}`);
}
