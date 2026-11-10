import { z } from "zod";

const t = (max: number) => z.string().trim().max(max);

export const settingsSchema = z.object({
  ragioneSociale: t(120).min(2, "Inserisci la ragione sociale"),
  nomeCommerciale: t(80),
  indirizzo: t(200).min(5, "Inserisci l'indirizzo"),
  partitaIva: t(20).refine((v) => v === "" || /^(IT)?\d{11}$/.test(v.replace(/\s/g, "")), "Partita IVA non valida (11 cifre)"),
  emailPrivacy: z.union([z.literal(""), z.string().trim().email("Email non valida").max(120)]),
  telefono: t(30),
  informativa: t(12000).min(200, "L'informativa è troppo corta"),
  versioneInformativa: t(40).min(1),
  metaPixelId: t(20).refine((v) => v === "" || /^\d{10,20}$/.test(v), "L'ID del Pixel Meta è fatto solo di cifre"),
  ga4Id: t(20).refine((v) => v === "" || /^G-[A-Z0-9]{4,15}$/.test(v), "L'ID di Google Analytics inizia con G-"),
  gtmId: t(20).refine((v) => v === "" || /^GTM-[A-Z0-9]{4,10}$/.test(v), "L'ID di Google Tag Manager inizia con GTM-"),
});
