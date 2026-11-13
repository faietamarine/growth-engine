"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { dividiNome, inviaLead } from "./invia-lead";

const CONDIZIONI_USATO = ["Ottime", "Buone", "Da sistemare"];

/** "Valuta la tua barca": descrive il mezzo e lascia i recapiti. Arriva come lead di permuta/acquisto usato. */
export function FormValuta({ marche, versioneInformativa, telefono }: { marche: string[]; versioneInformativa: string; telefono: string }) {
  const [stato, setStato] = useState<"idle" | "invio" | "ok">("idle");
  const [errore, setErrore] = useState<string | null>(null);

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    if (v("nominativo").length < 2) return setErrore("Inserisci nome e cognome.");
    if (v("telefono").length < 6) return setErrore("Inserisci il telefono.");
    if (v("marca").length < 2 || v("modello").length < 1) return setErrore("Indica marca e modello della tua barca.");
    if (fd.get("consensoPrivacy") !== "on") return setErrore("Serve il consenso per poterti ricontattare.");
    const { nome, cognome } = dividiNome(v("nominativo"));
    const descr = `${v("marca")} ${v("modello")}${v("anno") ? ` ${v("anno")}` : ""}`.trim();
    const risposte: Record<string, string> = { Richiesta: v("scopo") || "Valutazione", Barca: descr };
    for (const [k, c] of [["lunghezza", "Lunghezza (m)"], ["motore", "Motore"], ["ore", "Ore motore"], ["condizioni", "Condizioni"], ["richiesta", "Prezzo desiderato (€)"]] as const) if (v(k)) risposte[c] = v(k);
    setStato("invio");
    const r = await inviaLead({
      nome,
      cognome,
      telefono: v("telefono"),
      email: v("email"),
      interesse: `Valutazione usato: ${descr}`.slice(0, 120),
      tempistica: "Entro 3 mesi",
      messaggio: v("messaggio"),
      risposte,
      fonte: `Sito vetrina: valuta la tua barca (${descr})`.slice(0, 120),
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
        Richiesta ricevuta. Ti richiamiamo per la valutazione{telefono ? `, oppure chiamaci al ${telefono}` : ""}. Se vuoi, mandaci qualche foto su WhatsApp.
      </div>
    );

  return (
    <form onSubmit={invia} noValidate className="vt-form" aria-label="Valuta la tua barca">
      <fieldset>
        <legend className="sr-only">Che cosa vuoi fare</legend>
        <label>
          <input type="radio" name="scopo" value="Permuta" defaultChecked />
          <span>Permuta su un nuovo</span>
        </label>
        <label>
          <input type="radio" name="scopo" value="Vendita" />
          <span>Vendo la mia</span>
        </label>
      </fieldset>
      <label className="vt-c">
        Marca
        <input type="text" name="marca" list="vt-marche" required />
        <datalist id="vt-marche">
          {marche.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </label>
      <label className="vt-c">
        Modello
        <input type="text" name="modello" required />
      </label>
      <label className="vt-c">
        Anno <span style={{ fontWeight: 500 }}>(facoltativo)</span>
        <input type="text" name="anno" inputMode="numeric" maxLength={4} />
      </label>
      <label className="vt-c">
        Lunghezza in metri <span style={{ fontWeight: 500 }}>(facoltativa)</span>
        <input type="text" name="lunghezza" inputMode="decimal" />
      </label>
      <label className="vt-c">
        Motore <span style={{ fontWeight: 500 }}>(es. Yamaha F150, facoltativo)</span>
        <input type="text" name="motore" />
      </label>
      <label className="vt-c">
        Ore motore <span style={{ fontWeight: 500 }}>(facoltative)</span>
        <input type="text" name="ore" inputMode="numeric" />
      </label>
      <label className="vt-c">
        Condizioni
        <select name="condizioni" defaultValue="">
          <option value="">Preferisco non dirlo</option>
          {CONDIZIONI_USATO.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="vt-c">
        Prezzo che avevi in mente in € <span style={{ fontWeight: 500 }}>(facoltativo)</span>
        <input type="text" name="richiesta" inputMode="numeric" />
      </label>
      <label className="vt-c">
        Note <span style={{ fontWeight: 500 }}>(facoltative)</span>
        <textarea name="messaggio" maxLength={600} />
      </label>
      <hr style={{ border: 0, borderTop: "1px solid var(--linea)", margin: "6px 0" }} />
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
        Richiedi la valutazione
      </button>
    </form>
  );
}
