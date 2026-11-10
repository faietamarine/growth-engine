import { z } from "zod";
import { FUNNEL_STEP_TIPI, REPARTI } from "@/lib/enums";
import { CAMPI_OBBLIGATORI } from "./templates";

const t = (max: number) => z.string().trim().max(max);

export const TIPI_CAMPO = ["testo", "email", "telefono", "scelta", "numero", "area"] as const;

const campo = z
  .object({
    nome: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{1,39}$/, "Nome tecnico del campo non valido"),
    etichetta: t(120).min(2, "Ogni campo ha bisogno di un'etichetta"),
    tipo: z.enum(TIPI_CAMPO),
    obbligatorio: z.boolean(),
    opzioni: z.array(t(80).min(1)).max(12).optional(),
  })
  .refine((c) => c.tipo !== "scelta" || (c.opzioni?.length ?? 0) >= 1, { message: "I campi a scelta hanno bisogno di almeno un'opzione" });

/** Funnel completo come lo salva l'editor. */
export const funnelSchema = z
  .object({
    name: t(120).min(3, "Il nome deve avere almeno 3 caratteri"),
    campaignId: z.string().uuid().nullable(),
    reparto: z.enum(REPARTI),
    objective: t(400),
    audience: t(400),
    promise: t(400).min(5, "Scrivi la promessa del funnel"),
    leadMagnet: t(300),
    cta: t(60).min(2, "Scrivi l'invito all'azione"),
    steps: z
      .array(z.object({ ordine: z.number().int(), tipo: z.enum(FUNNEL_STEP_TIPI), titolo: t(120).min(2), descrizione: t(300) }))
      .min(1, "Serve almeno una pagina")
      .max(10),
    formFields: z.array(campo).min(2).max(15),
    emails: z.array(z.object({ giorno: z.number().int().min(0, "Giorno non valido").max(90, "Al massimo 90 giorni"), oggetto: t(140).min(2), testo: t(2000).min(5) })).max(8),
    whatsapp: z.array(z.object({ momento: t(120).min(2), testo: t(700).min(5) })).max(6),
    qualificationRules: z.array(t(200).min(1)).max(12),
  })
  .superRefine((f, ctx) => {
    const nomi = f.formFields.map((c) => c.nome);
    for (const n of CAMPI_OBBLIGATORI) {
      const c = f.formFields.find((x) => x.nome === n);
      if (!c) ctx.addIssue({ code: "custom", path: ["formFields"], message: `Il campo «${n}» è necessario per consegnare il lead al CRM` });
      else if (!c.obbligatorio) ctx.addIssue({ code: "custom", path: ["formFields"], message: `Il campo «${c.etichetta}» deve restare obbligatorio` });
    }
    const doppi = nomi.filter((n, i) => nomi.indexOf(n) !== i);
    if (doppi.length) ctx.addIssue({ code: "custom", path: ["formFields"], message: `Campo ripetuto: ${doppi[0]}` });
    if (!f.steps.some((s) => s.tipo === "FORM" || s.tipo === "QUIZ")) ctx.addIssue({ code: "custom", path: ["steps"], message: "Il funnel deve avere una pagina con il form o il quiz: senza, non raccoglie lead" });
  })
  .transform((f) => ({
    ...f,
    steps: f.steps.map((s, i) => ({ ...s, ordine: i + 1 })),
    emails: [...f.emails].sort((a, b) => a.giorno - b.giorno),
  }));

export type FunnelInput = z.output<typeof funnelSchema>;

/** Dall'etichetta al nome tecnico di un campo nuovo: "Lunghezza barca (m)" → "lunghezzaBarcaM". */
export function nomeCampo(etichetta: string): string {
  const parole = etichetta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  const n = parole.map((p, i) => (i === 0 ? p.toLowerCase() : p[0].toUpperCase() + p.slice(1).toLowerCase())).join("");
  return /^[a-zA-Z]/.test(n) ? n.slice(0, 40) : `campo${n}`.slice(0, 40);
}
