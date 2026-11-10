import { z } from "zod";
import { ASSET_STATUS, type AssetStatus, type Role } from "@/lib/enums";
import { can, type Action } from "@/lib/rbac";

/** I 13 tipi di asset creativi richiesti. */
export const TIPI_ASSET = [
  "Headline",
  "Testo pubblicitario",
  "Immagine",
  "Video",
  "Carousel",
  "Email",
  "Landing page",
  "Brochure",
  "Flyer",
  "Post social",
  "Script video",
  "Messaggio WhatsApp",
  "Materiale evento",
] as const;

/** URL del file: solo https (Drive, Dropbox, Canva…), niente javascript: o http in chiaro. */
const urlFile = z
  .string()
  .trim()
  .max(500)
  .refine((u) => u === "" || /^https:\/\/[^\s"'<>]+$/i.test(u), "Il link al file deve iniziare con https://");

export const assetSchema = z.object({
  title: z.string().trim().min(3, "Il titolo deve avere almeno 3 caratteri").max(160),
  type: z.enum(TIPI_ASSET, { errorMap: () => ({ message: "Scegli il tipo" }) }),
  campaignId: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null),
  authorId: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null),
  dueDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida")]).transform((v) => v || null),
  notes: z.string().trim().max(3000).default(""),
  aiPrompt: z.string().trim().max(3000).default(""),
  fileUrl: urlFile.transform((v) => v || null),
});
export type AssetInput = z.output<typeof assetSchema>;

/**
 * Percorso: Idea → Bozza → In revisione → Approvato → Pubblicato.
 * Approvare e pubblicare richiede campagne:approva (chi risponde dei contenuti che escono).
 * Si può sempre tornare indietro di un passo (es. revisione rimandata in bozza).
 */
type T = { to: AssetStatus; label: string; perm: Action; primaria?: boolean };
const PERCORSO: Record<AssetStatus, T[]> = {
  IDEA: [{ to: "BOZZA", label: "Inizia la bozza", perm: "contenuti:scrivi", primaria: true }],
  BOZZA: [
    { to: "REVISIONE", label: "Invia in revisione", perm: "contenuti:scrivi", primaria: true },
    { to: "IDEA", label: "Torna a idea", perm: "contenuti:scrivi" },
  ],
  REVISIONE: [
    { to: "APPROVATO", label: "Approva", perm: "campagne:approva", primaria: true },
    { to: "BOZZA", label: "Rimanda in bozza", perm: "contenuti:scrivi" },
  ],
  APPROVATO: [
    { to: "PUBBLICATO", label: "Segna come pubblicato", perm: "campagne:approva", primaria: true },
    { to: "REVISIONE", label: "Riapri la revisione", perm: "contenuti:scrivi" },
  ],
  PUBBLICATO: [],
};

export function transizioniAsset(from: AssetStatus, role: Role) {
  return PERCORSO[from].filter((t) => can(role, t.perm));
}
export const puoPassare = (from: AssetStatus, to: AssetStatus, role: Role) => transizioniAsset(from, role).some((t) => t.to === to);

/**
 * Versione: cambiare il file di un asset già in revisione o oltre crea una nuova versione
 * e lo riporta in bozza (va rivisto). Su idea/bozza si lavora liberamente sulla stessa versione.
 * Un asset pubblicato non si modifica: si crea una nuova versione (copia).
 */
export function effettoModifica(a: { status: AssetStatus; fileUrl: string | null; version: number }, nuovoFile: string | null) {
  const fileCambiato = (a.fileUrl ?? null) !== (nuovoFile ?? null);
  const avanzato = a.status === "REVISIONE" || a.status === "APPROVATO";
  if (fileCambiato && avanzato) return { version: a.version + 1, status: "BOZZA" as AssetStatus, messaggio: `File cambiato: ora è la versione ${a.version + 1}, torna in bozza per la revisione.` };
  return { version: a.version, status: a.status, messaggio: "Asset aggiornato." };
}

export const ORDINE_ASSET: Record<AssetStatus, number> = Object.fromEntries(ASSET_STATUS.map((s, i) => [s, i])) as Record<AssetStatus, number>;
