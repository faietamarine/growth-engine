import "server-only";

/** Avviso email immediato per una nuova richiesta dal sito. Si attiva solo se sono impostate RESEND_API_KEY e NOTIFY_EMAIL (Netlify → variabili d'ambiente). */
export async function avvisaNuovaRichiesta(r: { nome: string; telefono: string; interesse: string; fonte: string }) {
  const key = process.env.RESEND_API_KEY;
  const a = process.env.NOTIFY_EMAIL;
  if (!key || !a) return;
  const base = (process.env.URL || process.env.APP_URL || "").replace(/\/+$/, "");
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || "Faieta Marine <onboarding@resend.dev>",
        to: a.split(",").map((x) => x.trim()).filter(Boolean),
        subject: `Nuova richiesta dal sito: ${r.interesse}`.slice(0, 120),
        text: `${r.nome} ha lasciato il numero ${r.telefono}.\nRichiesta: ${r.interesse}\nDa: ${r.fonte}\n\nRichiamalo al più presto: ${base}/dashboard`,
      }),
      signal: AbortSignal.timeout(3500),
    });
  } catch {
    /* l'avviso non deve mai bloccare la raccolta del lead */
  }
}
