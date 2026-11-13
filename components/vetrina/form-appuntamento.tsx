"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { dividiNome, inviaLead } from "./invia-lead";

export type MezzoRif = { id: string; etichetta: string; prezzo: number | null; condizione: string };

/** Modulo "Prenota la tua visita o il tuo appuntamento": crea un lead (canale Sito) nel Growth Engine. */
export function FormAppuntamento({ mezzo, versioneInformativa, telefono }: { mezzo?: MezzoRif; versioneInformativa: string; telefono: string }) {
  const [stato, setStato] = useState<"idle" | "invio" | "ok">("idle");
  const [errore, setErrore] = useState<string | null>(null);
  const [campi, setCampi] = useState<Record<string, string>>({});

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setCampi({});
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const mancanti: Record<string, string> = {};
    if (v("nominativo").length < 2) mancanti.nominativo = "Inserisci nome e cognome";
    if (v("telefono").length < 6) mancanti.telefono = "Inserisci il telefono";
    if (fd.get("consensoPrivacy") !== "on") mancanti.consensoPrivacy = "Serve il consenso per poterti ricontattare";
    if (Object.keys(mancanti).length) {
      setCampi(mancanti);
      return setErrore("Completa i campi evidenziati.");
    }
    const { nome, cognome } = dividiNome(v("nominativo"));
    const tipo = v("tipo") || "Visita a bordo";
    const risposte: Record<string, string> = { Richiesta: tipo };
    if (v("giorno")) risposte["Giorno preferito"] = v("giorno").split("-").reverse().join("/");
    if (mezzo) {
      risposte["Annuncio"] = `/vetrina/mezzo/${mezzo.id}`;
      risposte["Condizione"] = mezzo.condizione;
    }
    setStato("invio");
    const r = await inviaLead({
      nome,
      cognome,
      telefono: v("telefono"),
      email: v("email"),
      interesse: mezzo?.etichetta ?? "Visita o appuntamento",
      budget: mezzo?.prezzo ?? undefined,
      // Chi chiede una visita su un mezzo preciso è un contatto caldo.
      tempistica: mezzo ? "Entro 3 mesi" : "",
      messaggio: v("messaggio"),
      risposte,
      fonte: `Sito vetrina: ${mezzo?.etichetta ?? "richiesta generale"}`.slice(0, 120),
      consensoPrivacy: true,
      consensoMarketing: fd.get("consensoMarketing") === "on",
      versioneInformativa,
      sito: v("sito"),
    });
    if (r.ok) return setStato("ok");
    setStato("idle");
    setErrore(r.errore);
    if (r.campi) setCampi(r.campi);
  }

  if (stato === "ok")
    return (
      <div role="status" className="vt-ok">
        <CheckCircle2 size={34} />
        Richiesta ricevuta. Ti richiamiamo al più presto{telefono ? `, oppure chiamaci al ${telefono}` : ""}.
      </div>
    );

  const err = (k: string) => (campi[k] ? <p className="vt-err">{campi[k]}</p> : null);
  return (
    <form onSubmit={invia} noValidate className="vt-form" aria-label="Prenota la tua visita o il tuo appuntamento">
      <fieldset>
        <legend className="sr-only">Che cosa vuoi fare</legend>
        <label>
          <input type="radio" name="tipo" value="Visita a bordo" defaultChecked />
          <span>Visita a bordo</span>
        </label>
        <label>
          <input type="radio" name="tipo" value="Appuntamento in sede" />
          <span>Appuntamento in sede</span>
        </label>
      </fieldset>
      <label className="vt-c">
        Nome e cognome
        <input type="text" name="nominativo" autoComplete="name" required aria-invalid={!!campi.nominativo} />
        {err("nominativo")}
      </label>
      <label className="vt-c">
        Telefono
        <input type="tel" name="telefono" autoComplete="tel" inputMode="tel" required aria-invalid={!!campi.telefono} />
        {err("telefono")}
      </label>
      <label className="vt-c">
        Email <span style={{ fontWeight: 500 }}>(facoltativa)</span>
        <input type="email" name="email" autoComplete="email" />
        {err("email")}
      </label>
      <label className="vt-c">
        Giorno che preferisci <span style={{ fontWeight: 500 }}>(facoltativo)</span>
        <input type="date" name="giorno" />
      </label>
      <label className="vt-c">
        Messaggio <span style={{ fontWeight: 500 }}>(facoltativo)</span>
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
      {err("consensoPrivacy")}
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
        Prenota la tua visita o il tuo appuntamento
      </button>
    </form>
  );
}
