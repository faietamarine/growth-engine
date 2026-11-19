"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { dividiNome, inviaLead } from "./invia-lead";
import { IconaWhatsApp } from "./whatsapp";
import type { MezzoRif } from "./form-appuntamento";

export type SceltaFinanziamento = { anticipo: number; mesi: number; rata: number; taeg: number };
export const EVENTO_FINANZIAMENTO = "vt-finanziamento";

const eur = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions);

/**
 * Due varianti: "offerta" (pronta consegna e usato: offerta personalizzata su WhatsApp)
 * e "ordine" (modelli a catalogo: preventivo per l'ordine con allestimento e consegna desiderata).
 * Prima crea il lead, poi offre il pulsante per scrivere subito su WhatsApp.
 */
export function FormOfferta({ mezzo, tipo, whatsapp, telefono, versioneInformativa }: { mezzo: MezzoRif; tipo: "offerta" | "ordine"; whatsapp: string; telefono: string; versioneInformativa: string }) {
  const [stato, setStato] = useState<"idle" | "invio" | "ok">("idle");
  const [errore, setErrore] = useState<string | null>(null);
  const [campi, setCampi] = useState<Record<string, string>>({});
  const [fin, setFin] = useState<SceltaFinanziamento | null>(null);
  const [vuoleFin, setVuoleFin] = useState(false);

  // "Voglio questa rata" nel riquadro del finanziamento compila questo modulo.
  useEffect(() => {
    const h = (e: Event) => {
      setFin((e as CustomEvent<SceltaFinanziamento>).detail);
      setVuoleFin(true);
    };
    window.addEventListener(EVENTO_FINANZIAMENTO, h);
    return () => window.removeEventListener(EVENTO_FINANZIAMENTO, h);
  }, []);

  const ordine = tipo === "ordine";
  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    setCampi({});
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const mancanti: Record<string, string> = {};
    if (v("nominativo").length < 2) mancanti.nominativo = "Inserisci nome e cognome";
    if (v("telefono").length < 6) mancanti.telefono = "Inserisci il cellulare";
    if (fd.get("consensoPrivacy") !== "on") mancanti.consensoPrivacy = "Serve il consenso per poterti scrivere";
    if (Object.keys(mancanti).length) {
      setCampi(mancanti);
      return setErrore("Completa i campi evidenziati.");
    }
    const { nome, cognome } = dividiNome(v("nominativo"));
    const risposte: Record<string, string> = {
      Richiesta: ordine ? "Preventivo per ordine" : "Offerta su WhatsApp",
      Annuncio: `/vetrina/mezzo/${mezzo.id}`,
      Condizione: mezzo.condizione,
    };
    if (ordine && v("allestimento")) risposte["Allestimento richiesto"] = v("allestimento");
    if (ordine && v("consegna")) risposte["Consegna desiderata"] = v("consegna");
    if (fd.get("permuta") === "on") risposte["Permuta"] = v("permutaCosa") || "Sì, da valutare";
    if (vuoleFin) risposte["Finanziamento"] = fin ? `Anticipo ${eur(fin.anticipo)} €, ${fin.mesi} rate da ${eur(fin.rata)} € (TAEG ${fin.taeg.toLocaleString("it-IT")}%)` : "Sì, da valutare";
    setStato("invio");
    const r = await inviaLead({
      nome,
      cognome,
      telefono: v("telefono"),
      email: v("email"),
      interesse: `${ordine ? "Preventivo ordine" : "Offerta"}: ${mezzo.etichetta}`.slice(0, 120),
      budget: mezzo.prezzo ?? undefined,
      tempistica: ordine ? "Entro 6 mesi" : "Entro 3 mesi",
      messaggio: v("messaggio"),
      risposte,
      fonte: `Sito vetrina: ${mezzo.etichetta}`.slice(0, 120),
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

  const testoWa = `Ciao Faieta Marine, ho appena chiesto ${ordine ? "il preventivo d'ordine" : "l'offerta"} per ${mezzo.etichetta}.`;
  if (stato === "ok")
    return (
      <div role="status" className="vt-ok">
        <CheckCircle2 size={34} />
        <span>{ordine ? "Richiesta ricevuta: ti mandiamo il preventivo con tempi di consegna." : "Richiesta ricevuta: ti mandiamo l'offerta su WhatsApp."} Vuoi fare prima? Scrivici adesso.</span>
        {whatsapp ? (
          <a className="vt-btn vt-btn-wa" href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(testoWa)}`} target="_blank" rel="noopener">
            <IconaWhatsApp size={20} /> Scrivici su WhatsApp
          </a>
        ) : telefono ? (
          <span>Oppure chiamaci al {telefono}.</span>
        ) : null}
      </div>
    );

  const err = (k: string) => (campi[k] ? <p className="vt-err">{campi[k]}</p> : null);
  return (
    <form onSubmit={invia} noValidate className="vt-form" aria-label={ordine ? "Richiedi il preventivo per l'ordine" : "Ricevi l'offerta su WhatsApp"}>
      <label className="vt-c">
        Nome e cognome
        <input type="text" name="nominativo" autoComplete="name" aria-invalid={!!campi.nominativo} />
        {err("nominativo")}
      </label>
      <label className="vt-c">
        Cellulare {ordine ? "" : "(WhatsApp)"}
        <input type="tel" name="telefono" autoComplete="tel" inputMode="tel" aria-invalid={!!campi.telefono} />
        {err("telefono")}
      </label>
      {ordine && (
        <>
          <label className="vt-c">
            Motore e allestimento che ti interessano <span style={{ fontWeight: 500 }}>(facoltativo)</span>
            <input type="text" name="allestimento" maxLength={200} placeholder="Es. motore 200 cv, tendalino, elettronica" />
          </label>
          <label className="vt-c">
            Quando lo vorresti
            <select name="consegna" defaultValue="Per la prossima stagione">
              <option>Prima possibile</option>
              <option>Per la prossima stagione</option>
              <option>Sto valutando, nessuna fretta</option>
            </select>
          </label>
        </>
      )}
      <label className="vt-scelta-si">
        <input type="checkbox" name="permuta" />
        <span>Ho un mezzo da dare in permuta</span>
      </label>
      <label className="vt-scelta-si">
        <input type="checkbox" checked={vuoleFin} onChange={(e) => setVuoleFin(e.target.checked)} />
        <span>
          Mi interessa il finanziamento
          {vuoleFin && fin ? ` · ${fin.mesi} rate da ${eur(fin.rata)} € (TAEG ${fin.taeg.toLocaleString("it-IT")}%)` : ""}
        </span>
      </label>
      <div className="vt-trappola" aria-hidden>
        <label>
          Non compilare
          <input type="text" name="sito" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="vt-consenso">
        <input type="checkbox" name="consensoPrivacy" aria-invalid={!!campi.consensoPrivacy} />
        <span>
          Ho letto l&apos;<a href="/l/privacy" target="_blank" rel="noopener">informativa privacy</a> e acconsento a essere ricontattato, anche su WhatsApp.
        </span>
      </label>
      {err("consensoPrivacy")}
      <label className="vt-consenso">
        <input type="checkbox" name="consensoMarketing" />
        <span>Voglio ricevere offerte e novità Faieta Marine (facoltativo).</span>
      </label>
      {errore && (
        <p role="alert" className="vt-err">
          {errore}
        </p>
      )}
      <button type="submit" className={`vt-btn ${ordine ? "vt-btn-giallo" : "vt-btn-wa"}`} disabled={stato === "invio"}>
        {stato === "invio" ? <Loader2 size={18} className="animate-spin" /> : ordine ? null : <IconaWhatsApp size={20} />}
        {ordine ? "Richiedi il preventivo" : "Ricevi l'offerta su WhatsApp"}
      </button>
      <p className="vt-nota-form">Rispondiamo in giornata negli orari di apertura. Nessun impegno.</p>
    </form>
  );
}
