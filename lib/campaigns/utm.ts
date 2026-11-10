import type { Channel } from "@/db/schema";

/** utm_source / utm_medium standard per canale: così i lead vengono attribuiti al canale giusto. */
export const UTM_CANALE: Record<Channel, { source: string; medium: string }> = {
  META: { source: "facebook", medium: "cpc" },
  GOOGLE: { source: "google", medium: "cpc" },
  EMAIL: { source: "newsletter", medium: "email" },
  WHATSAPP: { source: "whatsapp", medium: "messaggio" },
  ORGANICO: { source: "instagram", medium: "organico" },
  EVENTO: { source: "evento", medium: "qr" },
  REFERRAL: { source: "referral", medium: "passaparola" },
  SITO: { source: "sito", medium: "organico" },
};

export function utmQuery(canale: Channel, campaign: string, content?: string) {
  const u = UTM_CANALE[canale];
  const p = new URLSearchParams({ utm_source: u.source, utm_medium: u.medium, utm_campaign: campaign });
  if (content) p.set("utm_content", content);
  return p.toString();
}

/** Dal valore utm_source/medium al canale (usato dalla raccolta lead se il form non lo indica). */
export function channelFromUtm(source = "", medium = ""): Channel | null {
  const s = source.toLowerCase();
  const m = medium.toLowerCase();
  if (/facebook|instagram|meta|fb|ig/.test(s)) return m === "organico" || m === "organic" ? "ORGANICO" : "META";
  if (/google|adwords/.test(s)) return "GOOGLE";
  if (/newsletter|mail/.test(s) || m === "email") return "EMAIL";
  if (/whatsapp|wa/.test(s)) return "WHATSAPP";
  if (/evento|qr|fiera|salone/.test(s) || m === "qr") return "EVENTO";
  if (/referral|amico/.test(s)) return "REFERRAL";
  return null;
}
