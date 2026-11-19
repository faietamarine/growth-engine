"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, FileText, Phone } from "lucide-react";
import { FormAppuntamento, type MezzoRif } from "./form-appuntamento";
import { EVENTO_FINANZIAMENTO, FormOfferta } from "./form-offerta";
import { IconaWhatsApp } from "./whatsapp";

/**
 * Nella scheda del mezzo il cliente sceglie COME procedere, secondo quanto è deciso:
 * chi vuole solo il prezzo chiede l'offerta su WhatsApp, chi è pronto prenota prova o visita, chi vuole parlare chiama.
 * Per i modelli a catalogo l'azione principale è il preventivo d'ordine.
 */
export function SceltaAzione({ mezzo, aCatalogo, whatsapp, telefono, versioneInformativa, finanziamento }: { mezzo: MezzoRif; aCatalogo: boolean; whatsapp: string; telefono: string; versioneInformativa: string; finanziamento?: boolean }) {
  const [scelta, setScelta] = useState<"offerta" | "visita">("offerta");
  // Dal riquadro "Vuoi finanziarlo?" si torna sempre al modulo dell'offerta.
  useEffect(() => {
    const h = () => setScelta("offerta");
    window.addEventListener(EVENTO_FINANZIAMENTO, h);
    return () => window.removeEventListener(EVENTO_FINANZIAMENTO, h);
  }, []);
  const tel = `tel:${telefono.replace(/[^\d+]/g, "")}`;
  return (
    <div className="vt-scelta" id="offerta">
      <p className="vt-scelta-tit">Come vuoi procedere?</p>
      <div className="vt-scelta-tab" role="tablist">
        <button type="button" role="tab" aria-selected={scelta === "offerta"} className={scelta === "offerta" ? "on" : ""} onClick={() => setScelta("offerta")}>
          {aCatalogo ? <FileText size={18} aria-hidden /> : <IconaWhatsApp size={18} />}
          {aCatalogo ? "Preventivo d'ordine" : "Offerta WhatsApp"}
        </button>
        <button type="button" role="tab" aria-selected={scelta === "visita"} className={scelta === "visita" ? "on" : ""} onClick={() => setScelta("visita")}>
          <CalendarCheck size={18} aria-hidden />
          {aCatalogo ? "Appuntamento" : "Prova o visita"}
        </button>
        <a href={tel} className="vt-scelta-tel">
          <Phone size={18} aria-hidden /> Chiama
        </a>
      </div>
      {scelta === "offerta" ? (
        <FormOfferta mezzo={mezzo} tipo={aCatalogo ? "ordine" : "offerta"} whatsapp={whatsapp} telefono={telefono} versioneInformativa={versioneInformativa} finanziamento={finanziamento} />
      ) : (
        <FormAppuntamento mezzo={mezzo} versioneInformativa={versioneInformativa} telefono={telefono} />
      )}
    </div>
  );
}
