import { z } from "zod";

export const CTA_TIPI = [
  { id: "NESSUNO", nome: "Nessun pulsante" },
  { id: "VISITA", nome: "Prenota visita o appuntamento" },
  { id: "MEZZO", nome: "Apri un mezzo preciso" },
] as const;

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");

export const promoSchema = z
  .object({
    titolo: z.string().trim().min(2, "Scrivi il titolo").max(70, "Titolo troppo lungo (max 70 caratteri)"),
    testo: z.string().trim().max(220, "Testo troppo lungo (max 220 caratteri)").default(""),
    ctaTipo: z.enum(["NESSUNO", "VISITA", "MEZZO"]).default("NESSUNO"),
    ctaTesto: z.string().trim().max(30, "Testo del pulsante troppo lungo").default(""),
    mezzoId: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.string().uuid().optional()),
    inizio: data,
    fine: data,
    attivo: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  })
  .superRefine((d, ctx) => {
    if (d.fine < d.inizio) ctx.addIssue({ code: "custom", path: ["fine"], message: "La data di fine è prima dell'inizio" });
    if (d.ctaTipo === "MEZZO" && !d.mezzoId) ctx.addIssue({ code: "custom", path: ["mezzoId"], message: "Scegli il mezzo a cui porta il pulsante" });
  });
export type PromoInput = z.infer<typeof promoSchema>;

/** Data di oggi in Italia (AAAA-MM-GG): le date dell'avviso sono giorni di calendario, non istanti. */
export const oggiRoma = (now = new Date()) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(now);

export const inCorso = (p: { attivo: boolean; inizio: string; fine: string }, oggi = oggiRoma()) => p.attivo && p.inizio <= oggi && oggi <= p.fine;

export function etichettaCta(p: { ctaTipo: string; ctaTesto: string }) {
  if (p.ctaTipo === "NESSUNO") return "";
  return p.ctaTesto || (p.ctaTipo === "VISITA" ? "Prenota la tua visita" : "Scoprilo");
}
