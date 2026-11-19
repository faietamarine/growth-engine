"use client";

import { Landmark } from "lucide-react";
import { EVENTO_FINANZIAMENTO } from "./form-offerta";

/**
 * "Vuoi finanziarlo?": niente rate né tassi sul sito (il mezzo nautico si finanzia solo in sede).
 * Il pulsante porta alle 3 domande del modulo; il venditore richiama con una proposta su misura.
 * Restano finanziatore, contatti e avviso obbligatorio della pubblicità del credito.
 */
export function FinanziamentoMezzo({ finanziaria, contatti, fine }: { finanziaria: string; contatti: string; fine: string | null }) {
  const vai = () => {
    window.dispatchEvent(new CustomEvent(EVENTO_FINANZIAMENTO));
    document.getElementById("offerta")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <section className="vt-box vt-fin" aria-labelledby="t-fin">
      <div className="vt-fin-testa">
        <Landmark size={30} aria-hidden />
        <div>
          <h2 id="t-fin">Vuoi finanziarlo?</h2>
          <p>Rispondi a 3 domande (acconto, rata che vorresti, durata): ti richiamiamo con una proposta di rata su misura, anche con la permuta del tuo usato.</p>
        </div>
      </div>
      <ul className="vt-fin-punti">
        <li>Rata costruita su di te, non un esempio standard</li>
        <li>Pratica e firma in sede, in un solo appuntamento</li>
        <li>Puoi unire permuta e acconto</li>
      </ul>
      <button type="button" className="vt-btn vt-btn-blu" style={{ width: "100%", justifyContent: "center" }} onClick={vai}>
        Calcoliamo la tua rata
      </button>
      <p className="vt-fin-avviso">Attenzione! Prendere in prestito denaro costa denaro.</p>
      <p className="vt-fin-legale">
        Messaggio pubblicitario con finalità promozionale. Finanziamento erogato da {finanziaria} ({contatti}), salvo approvazione della finanziaria. Le informazioni europee di base sul credito ai consumatori (SECCI) e le condizioni sono disponibili in sede.
        {fine ? ` Proposta valida fino al ${fine.split("-").reverse().join("/")}.` : ""}
      </p>
    </section>
  );
}
