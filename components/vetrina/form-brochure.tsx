"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { dividiNome, inviaLead } from "./invia-lead";

/** "Scarica la brochure": nome e contatto in cambio del PDF. Crea un lead e mostra il link di download. */
export function FormBrochure({ mezzoId, etichetta, versioneInformativa }: { mezzoId: string; etichetta: string; versioneInformativa: string }) {
  const [stato, setStato] = useState<"idle" | "invio" | "ok">("idle");
  const [errore, setErrore] = useState<string | null>(null);

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    if (v("nominativo").length < 2) return setErrore("Inserisci nome e cognome.");
    if (v("telefono").length < 6) return setErrore("Inserisci il telefono.");
    if (fd.get("consensoPrivacy") !== "on") return setErrore("Serve il consenso per poterti ricontattare.");
    const { nome, cognome } = dividiNome(v("nominativo"));
    setStato("invio");
    const r = await inviaLead({
      nome,
      cognome,
      telefono: v("telefono"),
      email: v("email"),
      interesse: `Brochure: ${etichetta}`.slice(0, 120),
      tempistica: "Entro 12 mesi",
      messaggio: "",
      risposte: { Richiesta: "Brochure scaricata", Annuncio: `/vetrina/mezzo/${mezzoId}` },
      fonte: `Sito vetrina: brochure ${etichetta}`.slice(0, 120),
      consensoPrivacy: true,
      consensoMarketing: fd.get("consensoMarketing") === "on",
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
        <a href={`/vetrina/brochure/${mezzoId}`} className="vt-btn vt-btn-giallo" download>
          <Download size={18} /> Scarica la brochure (PDF)
        </a>
        <span>Grazie! Se vuoi, ti richiamiamo per una visita.</span>
      </div>
    );

  return (
    <form onSubmit={invia} noValidate className="vt-form" aria-label="Scarica la brochure">
      <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, color: "var(--blu-scuro)" }}>
        <Download size={20} /> Scarica la brochure
      </h3>
      <label className="vt-c">
        Nome e cognome
        <input type="text" name="nominativo" autoComplete="name" required />
      </label>
      <label className="vt-c">
        Telefono
        <input type="tel" name="telefono" autoComplete="tel" inputMode="tel" required />
      </label>
      <label className="vt-c">
        Email <span style={{ fontWeight: 500 }}>(facoltativa)</span>
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
      <label className="vt-consenso">
        <input type="checkbox" name="consensoMarketing" />
        <span>Voglio ricevere novità e offerte Faieta Marine (facoltativo).</span>
      </label>
      {errore && (
        <p role="alert" className="vt-err">
          {errore}
        </p>
      )}
      <button type="submit" className="vt-btn vt-btn-blu" disabled={stato === "invio"}>
        {stato === "invio" && <Loader2 size={18} className="animate-spin" />}
        Ricevi la brochure
      </button>
    </form>
  );
}
