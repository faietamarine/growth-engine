/* Invio dei moduli del sito all'API pubblica dei lead (stessa pipeline delle landing page). */
export type EsitoLead = { ok: true } | { ok: false; errore: string; campi?: Record<string, string> };

function segnalaLead() {
  const w = window as unknown as { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };
  try {
    w.fbq?.("track", "Lead");
    w.gtag?.("event", "generate_lead");
    w.dataLayer?.push({ event: "lead" });
  } catch {}
}

export function dividiNome(completo: string) {
  const [nome, ...r] = completo.trim().split(/\s+/);
  return { nome: nome ?? "", cognome: r.join(" ") };
}

export async function inviaLead(body: Record<string, unknown>): Promise<EsitoLead> {
  const url = new URL(window.location.href);
  let utm: Record<string, string> = Object.fromEntries(["source", "medium", "campaign", "content", "term"].map((k) => [k, url.searchParams.get(`utm_${k}`) ?? undefined]).filter(([, v]) => v));
  // Se il visitatore è arrivato con un link tracciato e poi ha cambiato pagina, la provenienza è in memoria.
  if (!Object.keys(utm).length) {
    try {
      utm = JSON.parse(sessionStorage.getItem("vt-utm") ?? "{}");
    } catch {}
  }
  try {
    // La provenienza si vede anche nella fonte del lead, es. "Sito vetrina: Joker Clubman 26 (da whatsapp catalogo)".
    const fonte = typeof body.fonte === "string" && utm.source ? `${body.fonte} (da ${utm.source}${utm.medium ? ` ${utm.medium}` : ""})`.slice(0, 120) : body.fonte;
    const res = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ canale: "SITO", reparto: "VENDITA", utm, ...body, ...(fonte ? { fonte } : {}) }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      segnalaLead();
      return { ok: true };
    }
    return { ok: false, errore: j.errore ?? "Invio non riuscito. Riprova.", campi: j.campi };
  } catch {
    return { ok: false, errore: "Connessione assente. Controlla la rete e riprova." };
  }
}
