import { z } from "zod";
import { CHANNELS, REPARTI } from "@/lib/enums";

/** Tempistiche proposte nei form: la risposta pesa sul punteggio (vedi score.ts). */
export const TEMPI_VENDITA = ["Entro 3 mesi", "Entro 6 mesi", "Entro 12 mesi", "Sto solo guardando"] as const;
export const TEMPI_SERVICE = ["Urgente", "Entro il mese", "Prossima stagione"] as const;

/** Fasce di budget dei form: valore centrale usato per il punteggio e per il campo Budget del CRM. */
export const FASCE_BUDGET: Record<string, number> = {
  "Fino a 20.000": 15000,
  "20.000–50.000": 35000,
  "50.000–100.000": 75000,
  "Oltre 100.000": 120000,
};

/**
 * Normalizza un telefono. Italiani: "+39 " + cifre nazionali. Esteri: "+" + cifre.
 * Restituisce null se il numero non è plausibile.
 */
export function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s.\-()/]/g, "");
  let digits: string;
  let intl = false;
  if (s.startsWith("+")) {
    digits = s.slice(1);
    intl = true;
  } else if (s.startsWith("00")) {
    digits = s.slice(2);
    intl = true;
  } else digits = s;
  if (!/^\d+$/.test(digits)) return null;

  if (intl && !digits.startsWith("39")) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  const naz = intl ? digits.slice(2) : digits;
  const cellulare = /^3\d{8,9}$/.test(naz);
  const fisso = /^0\d{5,10}$/.test(naz);
  return cellulare || fisso ? `+39 ${naz}` : null;
}

const testo = (max: number) => z.string().trim().max(max).default("");

/** Dati in arrivo da un form pubblico (landing, quiz, evento). */
export const leadInputSchema = z
  .object({
    nome: z.string().trim().min(2, "Inserisci il nome").max(60),
    cognome: testo(60),
    azienda: testo(120),
    telefono: z.string().trim().min(6, "Inserisci il telefono").max(25),
    email: z.union([z.literal(""), z.string().trim().email("Email non valida").max(120)]).default(""),
    interesse: testo(200),
    budget: z.coerce.number().min(0).max(10_000_000).optional(),
    budgetFascia: testo(40),
    zona: testo(80),
    tempistica: testo(40),
    messaggio: testo(1500),
    risposte: z.record(z.string().max(60), z.string().max(300)).default({}),
    canale: z.enum(CHANNELS).optional(), // se manca si ricava dagli UTM, altrimenti "SITO"
    fonte: testo(120),
    reparto: z.enum(REPARTI).default("VENDITA"),
    campagna: testo(80), // utm_campaign della campagna
    landing: z.string().trim().regex(/^[a-z0-9-]{0,60}$/).default(""), // slug della landing di provenienza
    variante: z.enum(["A", "B"]).optional(),
    utm: z
      .object({ source: testo(80), medium: testo(80), campaign: testo(80), content: testo(80), term: testo(80) })
      .partial()
      .default({}),
    consensoPrivacy: z.literal(true, { errorMap: () => ({ message: "Serve il consenso al trattamento dei dati" }) }),
    consensoMarketing: z.boolean().default(false),
    consensoProfilazione: z.boolean().default(false),
    versioneInformativa: testo(40),
    // Campo trappola anti-bot: deve restare vuoto.
    sito: z.string().max(0, "Richiesta non valida").optional(),
  })
  .transform((d, ctx) => {
    const tel = normalizePhone(d.telefono);
    if (!tel) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["telefono"], message: "Numero di telefono non valido" });
    const fascia = d.budgetFascia && FASCE_BUDGET[d.budgetFascia];
    return {
      ...d,
      telefono: tel ?? d.telefono,
      budget: d.budget ?? (fascia || undefined),
      risposte: d.budgetFascia ? { ...d.risposte, "Budget indicato": d.budgetFascia } : d.risposte,
    };
  });

export type LeadInput = z.output<typeof leadInputSchema>;
