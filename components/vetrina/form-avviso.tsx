"use client";

import { useState } from "react";
import { BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { dividiNome, inviaLead } from "./invia-lead";

/** "Avvisami se arriva": chi non trova il mezzo (o lo trova venduto) lascia un contatto e diventa un lead. */
export function FormAvviso({ cosa, versioneInformativa, mezzoId, titolo = "Avvisami se ne arriva uno" }: { cosa: string; versioneInformativa: string; mezzoId?: string; titolo?: string }) {
  const [stato, setStato] = useState<"idle" | "invio" | "ok">("idle");
  const [errore, setErrore] = useState<string | null>(null);

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    if (v("nominativo").length < 2) return setErrore("Inserisci nome e cognome.");
    if (v("telefono").length < 6 && !/.+@.+\..+/.test(v("email"))) return setErrore("Lascia un telefono o un'email per poterti avvisare.");
    if (fd.get("consensoPrivacy") !== "on") return setErrore("Serve il consenso per poterti ricontattare.");
    const { nome, cognome } = dividiNome(v("nominativo"));
    const risposte: Record<string, string> = { Richiesta: "Avviso quando arriva" };
    if (mezzoId) risposte["Annuncio"] = `/vetrina/mezzo/${mezzoId}`;
    setStato("invio");
    const r = await inviaLead({
      nome,
      cognome,
      telefono: v("telefono"),
      email: v("email"),
      interesse: `Avviso arrivi: ${cosa}`.slice(0, 120),
      tempistica: "Entro 6 mesi",
      messaggio: "",
      risposte,
      fonte: `Sito vetrina: avviso arrivi ${cosa}`.slice(0, 120),
      consensoPrivacy: true,
      consensoMarketing: false,
      versioneInformativa,
      sito: v("sito"),
    });
    if (r.ok) return setStato("ok");
    setStato("idle");
    setErrore(r.errore);
  }

  if (stato === "ok")
    return (
      <div role="status" className="vt-ok">
        <CheckCircle2 size={34} />
        Perfetto, ti avvisiamo appena ne arriva uno simile.
      </div>
    );

  return (
    <form onSubmit={invia} noValidate className="vt-form" aria-label={titolo}>
      <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, color: "var(--blu-scuro)" }}>
        <BellRing size={20} /> {titolo}
      </h3>
      <label className="vt-c">
        Nome e cognome
        <input type="text" name="nominativo" autoComplete="name" required />
      </label>
      <label className="vt-c">
        Telefono
        <input type="tel" name="telefono" autoComplete="tel" inputMode="tel" />
      </label>
      <label className="vt-c">
        Email <span style={{ fontWeight: 500 }}>(se preferisci)</span>
        <input type="email" name="email" autoComplete="email" />
      </label>
      <div className="vt-trappola" aria-hidden>
        <label>
          Non compilare
          <input type="text" name="sito" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="vt-consenso">
        <input type="checkbox" name="consensoPrivacy" />
        <span>
          Ho letto l&apos;<a href="/l/privacy" target="_blank" rel="noopener">informativa privacy</a> e acconsento a essere ricontattato.
        </span>
      </label>
      {errore && (
        <p role="alert" className="vt-err">
          {errore}
        </p>
      )}
      <button type="submit" className="vt-btn vt-btn-giallo" disabled={stato === "invio"}>
        {stato === "invio" && <Loader2 size={18} className="animate-spin" />}
        Avvisami
      </button>
    </form>
  );
}
