"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { abbinaFoto, duplicaMezzo, importaMezzi, segnaRichiamato, variaPrezzi } from "@/features/vetrina/service";
import { leggiCsv, righeImport } from "@/lib/vetrina/strumenti";
import { MARCHIO_SLUGS } from "@/lib/brands/catalog";
import { CONDIZIONE_IDS } from "@/lib/vetrina/catalog";

const uuid = z.string().uuid();
const msg = (p: string, m: string, k: "msg" | "errore" = "msg") => `${p}?${k}=${encodeURIComponent(m)}`;
function rinfresca() {
  revalidatePath("/mezzi");
  revalidatePath("/vetrina", "layout");
}

export async function duplicaMezzoAction(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  const id = await duplicaMezzo(uuid.parse(form.get("id")), user);
  rinfresca();
  redirect(msg(`/mezzi/${id}`, "Copia creata come bozza: cambia modello, prezzo e foto, poi mettila online."));
}

const prezziSchema = z.object({
  marca: z.string().refine((v) => v === "" || (MARCHIO_SLUGS as string[]).includes(v)),
  condizione: z.string().refine((v) => v === "" || (CONDIZIONE_IDS as string[]).includes(v)),
  tipo: z.enum(["PERCENTUALE", "IMPORTO"]),
  valore: z.preprocess((v) => Number(String(v).replace(",", ".")), z.number().finite().min(-100000).max(100000)),
  azione: z.enum(["anteprima", "applica"]).default("anteprima"),
});

export async function prezziAction(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  const p = prezziSchema.safeParse(Object.fromEntries(form));
  if (!p.success || p.data.valore === 0) redirect(msg("/mezzi/strumenti", "Controlla i campi: serve una variazione diversa da zero.", "errore"));
  const { azione, ...v } = p.data;
  const q = new URLSearchParams({ marca: v.marca, condizione: v.condizione, tipo: v.tipo, valore: String(v.valore) }).toString();
  if (azione === "anteprima") redirect(`/mezzi/strumenti?${q}#prezzi`);
  const cambi = await variaPrezzi({ marca: v.marca || undefined, condizione: v.condizione || undefined }, { tipo: v.tipo, valore: v.valore }, user);
  rinfresca();
  redirect(msg("/mezzi/strumenti", cambi.length ? `Prezzi aggiornati su ${cambi.length} mezzi.` : "Nessun prezzo da cambiare."));
}

export async function importaCsvAction(form: FormData) {
  const user = await requireUser("contenuti:scrivi");
  const testo = String(form.get("csv") ?? "");
  if (testo.length > 400_000) redirect(msg("/mezzi/strumenti", "File troppo grande.", "errore"));
  const righe = righeImport(leggiCsv(testo));
  if (!righe.length) redirect(msg("/mezzi/strumenti", "Nel file non ho trovato righe da importare: serve la riga delle intestazioni e almeno un mezzo.", "errore"));
  const { creati, errori } = await importaMezzi(righe.slice(0, 500), user);
  rinfresca();
  const dettagli = errori.length ? ` Da correggere: ${errori.slice(0, 4).join(" · ")}${errori.length > 4 ? ` … (+${errori.length - 4})` : ""}` : "";
  redirect(msg("/mezzi/strumenti", `Importati ${creati} mezzi (come bozze).${dettagli}`, creati ? "msg" : "errore"));
}

const fotoSchema = z.array(z.object({ nome: z.string().max(200), id: z.string().uuid() })).max(300);
export async function abbinaFotoAction(file: { nome: string; id: string }[]) {
  const user = await requireUser("contenuti:scrivi");
  const p = fotoSchema.safeParse(file);
  if (!p.success) return { errore: "Dati non validi." };
  const r = await abbinaFoto(p.data, user);
  rinfresca();
  return r;
}

export async function richiamatoAction(form: FormData) {
  const user = await requireUser();
  await segnaRichiamato(uuid.parse(form.get("id")), user);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
