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
  const utm = Object.fromEntries(["source", "medium", "campaign", "content", "term"].map((k) => [k, url.searchParams.get(`utm_${k}`) ?? undefined]).filter(([, v]) => v));
  try {
    const res = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ canale: "SITO", reparto: "VENDITA", utm, ...body }) });
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
