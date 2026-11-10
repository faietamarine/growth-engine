/* ============================================================================
   Scrittura dei testi con l'AI (facoltativa).
   - AI_PROVIDER=mock (predefinito, gratuito): restano i testi dei modelli nautici.
   - AI_PROVIDER=anthropic + ANTHROPIC_API_KEY: Claude riscrive SOLO le parole
     (nome, angolo, promessa, hook, pain point, desideri, obiezioni, offerta, CTA, pubblico).
   Numeri, budget, canali e date non passano mai dall'AI.
   Se la chiamata fallisce o la risposta non è valida, si tengono i testi del modello.
   ============================================================================ */
import { z } from "zod";
import type { GeneratedCampaign } from "@/lib/campaigns/generate";

const copySchema = z.object({
  nome: z.string().min(5).max(120),
  angolo: z.string().min(10).max(400),
  promessa: z.string().min(10).max(300),
  hook: z.array(z.string().min(3).max(160)).min(3).max(5),
  painPoint: z.array(z.string().min(3).max(200)).min(3).max(6),
  desideri: z.array(z.string().min(3).max(200)).min(2).max(6),
  obiezioni: z.array(z.object({ obiezione: z.string().min(3).max(160), risposta: z.string().min(5).max(300) })).min(2).max(6),
  offerta: z.string().min(10).max(300),
  cta: z.string().min(3).max(60),
  audience: z.array(z.object({ nome: z.string().min(3).max(80), descrizione: z.string().min(5).max(240) })).min(2).max(5),
});
export type AiCopy = z.infer<typeof copySchema>;

export type CopyResult = { campaign: GeneratedCampaign; provider: "mock" | "anthropic"; nota?: string };

const TOOL = {
  name: "scrivi_testi_campagna",
  description: "Restituisce i testi di marketing della campagna, in italiano.",
  input_schema: {
    type: "object",
    properties: {
      nome: { type: "string", description: "Nome interno della campagna, max 90 caratteri" },
      angolo: { type: "string" },
      promessa: { type: "string" },
      hook: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
      painPoint: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
      desideri: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
      obiezioni: {
        type: "array",
        items: { type: "object", properties: { obiezione: { type: "string" }, risposta: { type: "string" } }, required: ["obiezione", "risposta"] },
        minItems: 2,
        maxItems: 6,
      },
      offerta: { type: "string" },
      cta: { type: "string", description: "Invito all'azione, max 6 parole" },
      audience: {
        type: "array",
        items: { type: "object", properties: { nome: { type: "string" }, descrizione: { type: "string" } }, required: ["nome", "descrizione"] },
        minItems: 2,
        maxItems: 5,
      },
    },
    required: ["nome", "angolo", "promessa", "hook", "painPoint", "desideri", "obiezioni", "offerta", "cta", "audience"],
  },
} as const;

function prompt(c: GeneratedCampaign, dettagli?: string) {
  const p = c.plan;
  return [
    "Sei il responsabile marketing di Faieta Marine, concessionaria nautica a Pescara (Abruzzo): vendita di barche nuove e usate (Joker Boat, Capelli, Jeanneau, Invictus, Capoforte, motori Yamaha), noleggio, officina e rimessaggio.",
    "Riscrivi i testi di questa campagna in italiano, concreti e credibili, senza superlativi vuoti e senza promettere sconti o prezzi che non sono indicati.",
    "Non inventare numeri, date, prezzi o premi. Mantieni l'offerta coerente con quella di partenza.",
    "",
    `Obiettivo dell'utente: ${c.objective}`,
    dettagli ? `Dettagli aggiuntivi: ${dettagli}` : "",
    `Reparto: ${c.reparto} · Periodo: ${c.startDate} → ${c.endDate}`,
    `Soggetto: ${p.soggetto}`,
    "",
    "Testi di partenza (migliorali, non stravolgerli):",
    JSON.stringify({ nome: c.name, angolo: p.angolo, promessa: p.promessa, hook: p.hook, painPoint: p.painPoint, desideri: p.desideri, obiezioni: p.obiezioni, offerta: p.offerta, cta: p.cta, audience: p.audience }),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function writeCopy(c: GeneratedCampaign, dettagli?: string, fetchImpl: typeof fetch = fetch): Promise<CopyResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (process.env.AI_PROVIDER !== "anthropic") return { campaign: c, provider: "mock" };
  if (!key) return { campaign: c, provider: "mock", nota: "AI non configurata (manca ANTHROPIC_API_KEY): usati i testi del modello." };

  try {
    const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-sonnet-5-5",
        max_tokens: 2000,
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [{ role: "user", content: prompt(c, dettagli) }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) throw new Error(`risposta ${res.status}`);
    const json = (await res.json()) as { content?: { type: string; name?: string; input?: unknown }[] };
    const block = json.content?.find((b) => b.type === "tool_use" && b.name === TOOL.name);
    const parsed = copySchema.safeParse(block?.input);
    if (!parsed.success) throw new Error("testi non validi");
    const a = parsed.data;
    return {
      provider: "anthropic",
      campaign: {
        ...c,
        name: a.nome.slice(0, 120),
        plan: { ...c.plan, generatoDa: "anthropic", angolo: a.angolo, promessa: a.promessa, hook: a.hook, painPoint: a.painPoint, desideri: a.desideri, obiezioni: a.obiezioni, offerta: a.offerta, cta: a.cta, audience: a.audience },
      },
    };
  } catch (e) {
    console.error("Testi AI non disponibili:", e);
    return { campaign: c, provider: "mock", nota: "L'AI non ha risposto: usati i testi del modello. Puoi riprovare con «Rigenera»." };
  }
}
