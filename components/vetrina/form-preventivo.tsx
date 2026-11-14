"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { dividiNome, inviaLead } from "./invia-lead";

export const SERVIZI = ["Tagliando o riparazione fuoribordo", "Assistenza moto d'acqua", "Rimessaggio e invernaggio", "Preparazione stagionale e varo", "Carenaggio e antivegetativa", "Altro / non so"];

/** Richiesta di preventivo per l'officina e il rimessaggio. Arriva come lead del reparto Service. */
export function FormPreventivo({ versioneInformativa, telefono, servizioIniziale }: { versioneInformativa: string; telefono: string; servizioIniziale?: string }) {
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
    const risposte: Record<string, string> = { Richiesta: "Preventivo", Servizio: v("servizio") };
    if (v("mezzo")) risposte["Mezzo"] = v("mezzo");
    setStato("invio");
    const r = await inviaLead({
      nome,
      cognome,
      telefono: v("telefono"),
      email: v("email"),
      reparto: "SERVICE",
      interesse: `Preventivo: ${v("servizio")}${v("mezzo") ? ` (${v("mezzo")})` : ""}`.slice(0, 120),
      tempistica: "Entro 3 mesi",
      messaggio: v("messaggio"),
      risposte,
      fonte: `Sito vetrina: preventivo ${v("servizio")}`.slice(0, 120),
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
        <CheckCircle2 size={34} />
        Richiesta ricevuta. Ti richiamiamo per il preventivo{telefono ? `, oppure chiamaci al ${telefono}` : ""}.
      </div>
    );

  return (
    <form onSubmit={invia} noValidate className="vt-form" aria-label="Richiedi un preventivo">
      <label className="vt-c">
        Di che cosa hai bisogno
        <select name="servizio" defaultValue={servizioIniziale ?? SERVIZI[0]}>
          {SERVIZI.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </label>
      <label className="vt-c">
        Il tuo mezzo <span style={{ fontWeight: 500 }}>(es. Capelli Tempest 600 con Yamaha F150, facoltativo)</span>
        <input type="text" name="mezzo" maxLength={120} />
      </label>
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
      <label className="vt-c">
        Descrivi il problema o la richiesta <span style={{ fontWeight: 500 }}>(facoltativo)</span>
        <textarea name="messaggio" maxLength={600} />
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
          Ho letto l&apos;<a href="/l/privacy" target="_blank" rel="noopener">informativa privacy</a> e acconsento al trattamento dei dati per essere ricontattato.
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
      <button type="submit" className="vt-btn vt-btn-giallo" disabled={stato === "invio"}>
        {stato === "invio" && <Loader2 size={18} className="animate-spin" />}
        Richiedi il preventivo
      </button>
    </form>
  );
}
