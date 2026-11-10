"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { BloccoForm } from "@/types/landing";
import { CAMPI_NOTI } from "@/lib/funnels/templates";

export type FormContext = {
  slug: string;
  variante: "A" | "B";
  reparto: string;
  campaignUtm: string;
  titolo: string;
  versioneInformativa: string;
  anteprima?: boolean;
};

const NOTI = new Set<string>(CAMPI_NOTI);

/** Invia un evento "Lead" ai pixel solo se l'utente li ha accettati (gli script sono caricati solo in quel caso). */
function segnalaLead() {
  const w = window as unknown as { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };
  try {
    w.fbq?.("track", "Lead");
    w.gtag?.("event", "generate_lead");
    w.dataLayer?.push({ event: "lead" });
  } catch {}
}

export function LeadForm({ b, ctx }: { b: BloccoForm; ctx: FormContext }) {
  const [stato, setStato] = useState<"idle" | "invio" | "ok">("idle");
  const [errore, setErrore] = useState<string | null>(null);
  const [campiErr, setCampiErr] = useState<Record<string, string>>({});

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ctx.anteprima) {
      setErrore("Anteprima: il form non invia dati.");
      return;
    }
    setErrore(null);
    setCampiErr({});
    const fd = new FormData(e.currentTarget);
    const val = (k: string) => String(fd.get(k) ?? "").trim();
    const mancanti = Object.fromEntries(b.campi.filter((c) => c.obbligatorio && !val(c.nome)).map((c) => [c.nome, "Campo obbligatorio"]));
    if (fd.get("consensoPrivacy") !== "on") mancanti.consensoPrivacy = "Per inviare la richiesta serve il consenso al trattamento dei dati.";
    if (Object.keys(mancanti).length) {
      setCampiErr(mancanti);
      setErrore("Completa i campi evidenziati.");
      return;
    }
    const risposte: Record<string, string> = {};
    for (const c of b.campi) if (!NOTI.has(c.nome) && val(c.nome)) risposte[c.etichetta.slice(0, 60)] = val(c.nome).slice(0, 300);
    // "Nome e cognome" in un campo solo: si divide sulla prima parola.
    let nome = val("nome");
    let cognome = val("cognome");
    if (!b.campi.some((c) => c.nome === "cognome") && nome.includes(" ")) {
      const [n, ...r] = nome.split(/\s+/);
      nome = n;
      cognome = r.join(" ");
    }
    const url = new URL(window.location.href);
    const utm = Object.fromEntries(["source", "medium", "campaign", "content", "term"].map((k) => [k, url.searchParams.get(`utm_${k}`) ?? undefined]).filter(([, v]) => v));
    const body = {
      nome,
      cognome,
      azienda: val("azienda"),
      telefono: val("telefono"),
      email: val("email"),
      interesse: val("interesse"),
      budgetFascia: val("budgetFascia"),
      tempistica: val("tempistica"),
      zona: val("zona"),
      messaggio: val("messaggio"),
      risposte,
      fonte: `Landing: ${ctx.titolo}`.slice(0, 120),
      reparto: ctx.reparto,
      campagna: ctx.campaignUtm,
      utm,
      landing: ctx.slug,
      variante: ctx.variante,
      consensoPrivacy: fd.get("consensoPrivacy") === "on",
      consensoMarketing: fd.get("consensoMarketing") === "on",
      versioneInformativa: ctx.versioneInformativa,
      sito: val("sito"),
    };
    setStato("invio");
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setStato("ok");
        segnalaLead();
        return;
      }
      setStato("idle");
      setErrore(j.errore ?? "Invio non riuscito. Riprova.");
      if (j.campi) setCampiErr(j.campi);
    } catch {
      setStato("idle");
      setErrore("Connessione assente. Controlla la rete e riprova.");
    }
  }

  if (stato === "ok") {
    return (
      <div role="status" className="rounded-xl bg-[#2F8F5B]/10 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-2 text-[#2F8F5B]" size={32} />
        <p className="text-[17px] font-semibold text-[#1A1F29]">{b.grazie}</p>
      </div>
    );
  }

  const err = (k: string) => (campiErr[k] ? <p className="mt-1 text-[13px] font-medium text-[#C0473F]">{campiErr[k]}</p> : null);
  const input = "w-full rounded-lg border border-[#C9CED6] bg-white px-3 py-2.5 text-[16px] text-[#1A1F29] focus:border-[#0F2340] focus:outline-none focus:ring-2 focus:ring-[#B8892F]/40";

  return (
    <form onSubmit={invia} noValidate className="space-y-4">
      {b.campi.map((c) => {
        const id = `f-${c.nome}`;
        const label = (
          <label htmlFor={id} className="mb-1 block text-[14px] font-semibold text-[#1A1F29]">
            {c.etichetta}
            {c.obbligatorio && <span className="text-[#C0473F]"> *</span>}
          </label>
        );
        const comune = { id, name: c.nome, required: c.obbligatorio, "aria-invalid": !!campiErr[c.nome] };
        if (c.tipo === "scelta") {
          const opz = c.opzioni ?? [];
          return (
            <fieldset key={c.nome}>
              <legend className="mb-1.5 block text-[14px] font-semibold text-[#1A1F29]">
                {c.etichetta}
                {c.obbligatorio && <span className="text-[#C0473F]"> *</span>}
              </legend>
              {opz.length <= 5 ? (
                <div className="flex flex-wrap gap-2">
                  {opz.map((o, i) => (
                    <label key={o} className="cursor-pointer">
                      <input type="radio" name={c.nome} value={o} required={c.obbligatorio && i === 0} className="peer sr-only" />
                      <span className="inline-block rounded-full border border-[#C9CED6] bg-white px-3.5 py-2 text-[14px] text-[#1A1F29] peer-checked:border-[#0F2340] peer-checked:bg-[#0F2340] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#B8892F]">
                        {o}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <select {...comune} className={input} defaultValue="">
                  <option value="" disabled>
                    Scegli…
                  </option>
                  {opz.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              )}
              {err(c.nome)}
            </fieldset>
          );
        }
        return (
          <div key={c.nome}>
            {label}
            {c.tipo === "area" ? (
              <textarea {...comune} rows={3} className={input} maxLength={1500} />
            ) : (
              <input
                {...comune}
                className={input}
                type={c.tipo === "email" ? "email" : c.tipo === "telefono" ? "tel" : c.tipo === "numero" ? "number" : "text"}
                inputMode={c.tipo === "telefono" ? "tel" : c.tipo === "numero" ? "numeric" : undefined}
                autoComplete={c.nome === "nome" ? "name" : c.nome === "email" ? "email" : c.tipo === "telefono" ? "tel" : undefined}
                maxLength={200}
              />
            )}
            {err(c.nome)}
          </div>
        );
      })}

      {/* Campo trappola per i bot: invisibile alle persone. */}
      <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label>
          Sito web <input name="sito" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="space-y-2 text-[13.5px] leading-snug text-[#3F4857]">
        <label className="flex gap-2.5">
          <input type="checkbox" name="consensoPrivacy" className="mt-0.5 h-4 w-4 shrink-0 accent-[#0F2340]" aria-invalid={!!campiErr.consensoPrivacy} />
          <span>
            Ho letto l&apos;
            <a href="/l/privacy" target="_blank" rel="noopener" className="font-semibold text-[#0F2340] underline">
              informativa privacy
            </a>{" "}
            e acconsento al trattamento dei miei dati per ricevere risposta alla richiesta. <span className="text-[#C0473F]">*</span>
          </span>
        </label>
        {err("consensoPrivacy")}
        <label className="flex gap-2.5">
          <input type="checkbox" name="consensoMarketing" className="mt-0.5 h-4 w-4 shrink-0 accent-[#0F2340]" />
          <span>Acconsento a ricevere offerte e novità via email, telefono o WhatsApp (facoltativo).</span>
        </label>
      </div>

      {errore && (
        <p role="alert" className="rounded-lg bg-[#C0473F]/10 px-3 py-2 text-[14px] font-medium text-[#C0473F]">
          {errore}
        </p>
      )}
      <button type="submit" disabled={stato === "invio"} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#B8892F] px-5 py-3.5 text-[16px] font-bold text-[#0C1A30] transition-colors hover:bg-[#E6C877] disabled:opacity-60">
        {stato === "invio" && <Loader2 size={18} className="animate-spin" />}
        {b.cta}
      </button>
    </form>
  );
}
