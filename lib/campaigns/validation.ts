import { z } from "zod";
import { CHANNELS, FUNNEL_STEP_TIPI, REPARTI } from "@/lib/enums";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");
const t = (max: number) => z.string().trim().max(max);
const lista = (max: number, len = 300) => z.array(t(len).min(1)).max(max);

/** Input del wizard (passo 1). */
export const generateInputSchema = z.object({
  obiettivo: z.string().trim().min(10, "Descrivi l'obiettivo in almeno 10 caratteri").max(400),
  reparto: z.enum(["AUTO", ...REPARTI]).default("AUTO"),
  dataInizio: data,
  durataGiorni: z.coerce.number().int().min(7, "Almeno 7 giorni").max(365, "Al massimo un anno"),
  budget: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().min(0, "Il budget non può essere negativo").max(500_000).optional()),
  leadTarget: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(1).max(10_000).optional()),
  dettagli: t(600).optional(),
});
export type GenerateFormInput = z.infer<typeof generateInputSchema>;

/** Piano completo (salvataggio e modifica). I numeri vengono comunque ricalcolati dal server. */
export const planSchema = z.object({
  scenario: t(40),
  soggetto: t(120),
  generatoDa: z.enum(["mock", "anthropic"]),
  generatoIl: t(40),
  kpi: z.array(z.object({ nome: t(80), target: z.number().min(0), unita: t(5).optional() })).max(12),
  audience: z.array(z.object({ nome: t(80).min(1), descrizione: t(300) })).max(8),
  angolo: t(500),
  promessa: t(400),
  hook: lista(8, 200),
  painPoint: lista(10),
  desideri: lista(10),
  obiezioni: z.array(z.object({ obiezione: t(200).min(1), risposta: t(400) })).max(10),
  offerta: t(400),
  cta: t(80),
  funnel: z
    .array(z.object({ ordine: z.number().int(), tipo: z.enum(FUNNEL_STEP_TIPI), titolo: t(120), descrizione: t(300) }))
    .max(12),
  formFields: z
    .array(
      z.object({
        nome: t(40),
        etichetta: t(120),
        tipo: z.enum(["testo", "email", "telefono", "scelta", "numero", "area"]),
        obbligatorio: z.boolean(),
        opzioni: z.array(t(80)).max(12).optional(),
      }),
    )
    .max(15),
  canali: z
    .array(z.object({ canale: z.enum(CHANNELS), quota: z.number().int().min(0).max(100), budget: z.number().min(0), cplStimato: z.number().min(0), leadStimati: z.number().min(0), perche: t(300) }))
    .min(1)
    .max(8),
  calendario: z
    .array(
      z.object({
        giorno: z.number().int(),
        data,
        attivita: t(200),
        tipo: z.enum(["preparazione", "lancio", "contenuto", "controllo", "chiusura"]),
        canale: z.enum(CHANNELS).optional(),
      }),
    )
    .max(60),
  asset: lista(20, 200),
  metriche: lista(20, 200),
  qualificazione: lista(12, 200),
  avvertenze: lista(15, 400),
  attivitaCreate: z.boolean().optional(),
});

export const saveCampaignSchema = z.object({
  name: z.string().trim().min(5, "Il nome deve avere almeno 5 caratteri").max(120),
  objective: z.string().trim().min(10).max(400),
  reparto: z.enum(REPARTI),
  startDate: data,
  endDate: data,
  budget: z.number().min(0).max(500_000),
  leadTarget: z.number().int().min(0).max(10_000),
  utmBase: z.string().regex(/^[a-z0-9-]{3,60}$/),
  plan: planSchema,
});
export type SaveCampaignInput = z.infer<typeof saveCampaignSchema>;

/** Una voce per riga → lista pulita. */
export const righe = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
