import { NextResponse } from "next/server";
import { leadInputSchema } from "@/lib/leads/validation";
import { createLeadFromInput } from "@/features/leads/service";

/* Raccolta lead pubblica: la usano landing page, quiz ed eventi.
   Accetta JSON o form classico. Protezioni: dimensione massima, campo trappola anti-bot,
   limite di 10 invii al minuto per indirizzo IP, consenso privacy obbligatorio. */

const MAX_BYTES = 20_000;
const CAMPI_LEAD = new Set(["nome", "cognome", "azienda", "telefono", "email", "interesse", "budget", "budgetFascia", "zona", "tempistica", "messaggio", "canale", "fonte", "reparto", "campagna", "consensoPrivacy", "consensoMarketing", "consensoProfilazione", "versioneInformativa", "sito", "landing", "variante"]);
const finestre = new Map<string, number[]>();

function troppeRichieste(ip: string) {
  const ora = Date.now();
  const recenti = (finestre.get(ip) ?? []).filter((t) => ora - t < 60_000);
  recenti.push(ora);
  finestre.set(ip, recenti);
  if (finestre.size > 5000) finestre.clear();
  return recenti.length > 10;
}

const bool = (v: unknown) => v === true || v === "true" || v === "on" || v === "1";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "sconosciuto";
  if (troppeRichieste(ip)) return NextResponse.json({ errore: "Troppe richieste, riprova tra un minuto." }, { status: 429 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return NextResponse.json({ errore: "Richiesta troppo grande." }, { status: 413 });

  let raw: Record<string, unknown>;
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) raw = await req.json();
    else {
      const f = await req.formData();
      const campi = Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
      // I campi propri del funnel (es. "dataPreferita") diventano risposte del lead.
      const risposte: Record<string, string> = {};
      for (const [k, v] of Object.entries(campi)) if (!CAMPI_LEAD.has(k) && !k.startsWith("utm_") && v.trim()) risposte[k.slice(0, 60)] = v.slice(0, 300);
      raw = { ...campi, risposte };
      raw.utm = { source: campi.utm_source, medium: campi.utm_medium, campaign: campi.utm_campaign, content: campi.utm_content, term: campi.utm_term };
    }
  } catch {
    return NextResponse.json({ errore: "Formato non valido." }, { status: 400 });
  }
  for (const k of ["consensoPrivacy", "consensoMarketing", "consensoProfilazione"]) raw[k] = bool(raw[k]);
  for (const k of ["budget", "canale"]) if (raw[k] === "") delete raw[k];

  const parsed = leadInputSchema.safeParse(raw);
  if (!parsed.success) {
    const campi = Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message]));
    return NextResponse.json({ errore: "Controlla i dati inseriti.", campi }, { status: 422 });
  }
  try {
    const lead = await createLeadFromInput(parsed.data, ip);
    return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  } catch (e) {
    console.error("Errore salvataggio lead", e);
    return NextResponse.json({ errore: "Non è stato possibile salvare la richiesta. Riprova." }, { status: 500 });
  }
}
