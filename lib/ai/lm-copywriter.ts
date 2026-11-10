/* Riscrittura facoltativa dei testi di un lead magnet con l'AI.
   Stesse regole del generatore di campagne: l'AI propone, il codice controlla
   (limiti di caratteri di Google e Meta) e in caso di problemi tiene i testi del modello. */
import { z } from "zod";
import type { LeadMagnetContent } from "@/types/lead-magnet";
import { LIMITI } from "@/types/lead-magnet";
import { entroLimite } from "@/lib/leadmagnets/generate";

const schema = z.object({
  titolo: z.string().min(5).max(160),
  sottotitolo: z.string().min(5).max(300),
  promessa: z.string().min(5).max(400),
  benefici: z.array(z.string().min(3).max(200)).min(3).max(6),
  headline: z.string().min(5).max(160),
  bullet: z.array(z.string().min(3).max(200)).min(3).max(6),
  metaAds: z.array(z.object({ testoPrincipale: z.string().min(10), titolo: z.string().min(3), descrizione: z.string().min(3) })).min(1).max(3),
  googleTitoli: z.array(z.string().min(3)).min(3).max(15),
  googleDescrizioni: z.array(z.string().min(10)).min(1).max(4),
  emailOggetto: z.string().min(3),
  emailAnteprima: z.string().min(3),
});

const TOOL = {
  name: "scrivi_lead_magnet",
  description: "Testi di un lead magnet per una concessionaria nautica, in italiano.",
  input_schema: {
    type: "object",
    properties: {
      titolo: { type: "string" },
      sottotitolo: { type: "string" },
      promessa: { type: "string" },
      benefici: { type: "array", items: { type: "string" } },
      headline: { type: "string" },
      bullet: { type: "array", items: { type: "string" } },
      metaAds: {
        type: "array",
        items: {
          type: "object",
          properties: {
            testoPrincipale: { type: "string", description: `max ${LIMITI.metaTesto} caratteri` },
            titolo: { type: "string", description: `max ${LIMITI.metaTitolo} caratteri` },
            descrizione: { type: "string", description: `max ${LIMITI.metaDescrizione} caratteri` },
          },
          required: ["testoPrincipale", "titolo", "descrizione"],
        },
      },
      googleTitoli: { type: "array", items: { type: "string", description: `max ${LIMITI.googleTitolo} caratteri` } },
      googleDescrizioni: { type: "array", items: { type: "string", description: `max ${LIMITI.googleDescrizione} caratteri` } },
      emailOggetto: { type: "string", description: `max ${LIMITI.emailOggetto} caratteri` },
      emailAnteprima: { type: "string", description: `max ${LIMITI.emailAnteprima} caratteri` },
    },
    required: ["titolo", "sottotitolo", "promessa", "benefici", "headline", "bullet", "metaAds", "googleTitoli", "googleDescrizioni", "emailOggetto", "emailAnteprima"],
  },
} as const;

export async function rewriteLeadMagnet(c: LeadMagnetContent, contesto: string, fetchImpl: typeof fetch = fetch): Promise<{ content: LeadMagnetContent; provider: "mock" | "anthropic"; nota?: string }> {
  if (process.env.AI_PROVIDER !== "anthropic") return { content: c, provider: "mock" };
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { content: c, provider: "mock", nota: "AI non configurata (manca ANTHROPIC_API_KEY): usati i testi del modello." };
  try {
    const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-sonnet-5-5",
        max_tokens: 2000,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [
          {
            role: "user",
            content: [
              "Sei il copywriter di Faieta Marine, concessionaria nautica a Pescara. Riscrivi i testi di questo lead magnet in italiano: concreti, credibili, senza superlativi vuoti.",
              "Non inventare prezzi, sconti, premi o date. Rispetta rigorosamente i limiti di caratteri indicati.",
              contesto ? `Contesto: ${contesto}` : "",
              "Testi di partenza:",
              JSON.stringify({ titolo: c.titolo, sottotitolo: c.sottotitolo, promessa: c.promessa, benefici: c.benefici, headline: c.landing.headline, bullet: c.landing.bullet, metaAds: c.metaAds, googleTitoli: c.googleAds.titoli, googleDescrizioni: c.googleAds.descrizioni, emailOggetto: c.email.oggetto, emailAnteprima: c.email.anteprima }),
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new Error(`risposta ${res.status}`);
    const json = (await res.json()) as { content?: { type: string; name?: string; input?: unknown }[] };
    const p = schema.safeParse(json.content?.find((b) => b.type === "tool_use" && b.name === TOOL.name)?.input);
    if (!p.success) throw new Error("testi non validi");
    const a = p.data;
    // Controlli del codice: ciò che sfora i limiti viene sostituito dal testo del modello.
    const titoli = entroLimite(a.googleTitoli, LIMITI.googleTitolo, 15);
    const descr = entroLimite(a.googleDescrizioni, LIMITI.googleDescrizione, 4);
    const meta = a.metaAds.filter((m) => m.testoPrincipale.length <= LIMITI.metaTesto && m.titolo.length <= LIMITI.metaTitolo && m.descrizione.length <= LIMITI.metaDescrizione);
    return {
      provider: "anthropic",
      content: {
        ...c,
        generatoDa: "anthropic",
        titolo: a.titolo,
        sottotitolo: a.sottotitolo,
        promessa: a.promessa,
        benefici: a.benefici,
        landing: { ...c.landing, headline: a.headline, sottotitolo: a.sottotitolo, bullet: a.bullet },
        metaAds: meta.length ? meta : c.metaAds,
        googleAds: { titoli: titoli.length >= 3 ? titoli : c.googleAds.titoli, descrizioni: descr.length ? descr : c.googleAds.descrizioni },
        email: { ...c.email, oggetto: a.emailOggetto.length <= LIMITI.emailOggetto ? a.emailOggetto : c.email.oggetto, anteprima: a.emailAnteprima.length <= LIMITI.emailAnteprima ? a.emailAnteprima : c.email.anteprima },
      },
    };
  } catch (e) {
    console.error("Testi AI del lead magnet non disponibili:", e);
    return { content: c, provider: "mock", nota: "L'AI non ha risposto: usati i testi del modello." };
  }
}
