"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { dividiNome, inviaLead } from "./invia-lead";

/**
 * Iscrizione a un evento o a una giornata di prove in mare. Arriva come lead del reparto Vendita;
 * a posti esauriti diventa "lista d'attesa" (non conta tra gli iscritti).
 */
export function FormEvento({
  evento,
  postiLiberi,
  mezzi,
  versioneInformativa,
  telefono,
}: {
  evento: { id: string; titolo: string; data: string; quando: string };
  /** null = senza limite; 0 = esaurito */
  postiLiberi: number | null;
  mezzi: string[];
  versioneInformativa: string;
  telefono: string;
}) {
  const [stato, setStato] = useState<"idle" | "invio" | "ok">("idle");
  const [errore, setErrore] = useState<string | null>(null);
  const attesa = postiLiberi === 0;
  const maxPersone = Math.max(1, Math.min(6, postiLiberi ?? 6));

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    if (v("nominativo").length < 2) return setErrore("Inserisci nome e cognome.");
    if (v("telefono").length < 6) return setErrore("Inserisci il telefono.");
    if (fd.get("consensoPrivacy") !== "on") return setErrore("Serve il consenso per poterti confermare l'iscrizione.");
    const { nome, cognome } = dividiNome(v("nominativo"));
    const persone = attesa ? "1" : v("persone") || "1";
    const risposte: Record<string, string> = {
      Richiesta: attesa ? "Lista d'attesa evento" : "Iscrizione evento",
      Evento: evento.titolo,
      Quando: evento.quando,
      Persone: persone,
      [attesa ? "EventoAttesaId" : "EventoId"]: evento.id,
    };
    if (v("mezzo")) risposte["Mezzo da provare"] = v("mezzo");
    setStato("invio");
    const r = await inviaLead({
      nome,
      cognome,
      telefono: v("telefono"),
      email: v("email"),
      interesse: `${attesa ? "Lista d'attesa" : "Iscrizione"}: ${evento.titolo}`.slice(0, 120),
      tempistica: "Entro 3 mesi",
      messaggio: v("messaggio"),
      risposte,
      fonte: `Sito vetrina: evento ${evento.titolo}`.slice(0, 120),
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
        {attesa ? "Sei in lista d'attesa: se si libera un posto ti chiamiamo." : "Iscrizione ricevuta! Ti chiamiamo per confermare il posto e l'orario."}
        {telefono ? ` Per qualsiasi cosa: ${telefono}.` : ""}
      </div>
    );

  return (
    <form onSubmit={invia} noValidate className="vt-form" aria-label={attesa ? "Lista d'attesa" : "Iscriviti all'evento"}>
      {attesa && <p className="vt-avviso-posti">Posti esauriti. Lasciaci il tuo numero: se qualcuno rinuncia ti chiamiamo per primo.</p>}
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
      {!attesa && (
        <label className="vt-c">
          Quante persone
          <select name="persone" defaultValue="1">
            {Array.from({ length: maxPersone }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      {mezzi.length > 0 && (
        <label className="vt-c">
          Cosa vorresti provare <span style={{ fontWeight: 500 }}>(facoltativo)</span>
          <select name="mezzo" defaultValue="">
            <option value="">Non so ancora</option>
            {mezzi.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      )}
      <label className="vt-c">
        Note <span style={{ fontWeight: 500 }}>(facoltative)</span>
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
        <span>Voglio essere avvisato dei prossimi eventi e delle offerte Faieta Marine (facoltativo).</span>
      </label>
      {errore && (
        <p role="alert" className="vt-err">
          {errore}
        </p>
      )}
      <button type="submit" className="vt-btn vt-btn-giallo" disabled={stato === "invio"}>
        {stato === "invio" && <Loader2 size={18} className="animate-spin" />}
        {attesa ? "Mettimi in lista d'attesa" : "Iscriviti"}
      </button>
    </form>
  );
}
