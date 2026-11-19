"use client";

import { useMemo, useState } from "react";
import { esempioFinanziamento, type ImpostazioniFinanziamento } from "@/lib/vetrina/finanziamento";
import { EVENTO_FINANZIAMENTO, type SceltaFinanziamento } from "./form-offerta";

const eur = (n: number, dec = 2) => `${n.toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: "always" } as Intl.NumberFormatOptions)} €`;
const perc = (n: number) => `${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

/**
 * Esempio rappresentativo di finanziamento, a norma di pubblicità del credito:
 * rata e TAEG con la stessa evidenza, tutte le voci dell'esempio, finanziatore e avviso obbligatorio.
 */
export function FinanziamentoMezzo({ prezzo, f, fine }: { prezzo: number; f: ImpostazioniFinanziamento; fine: string | null }) {
  const [anticipo, setAnticipo] = useState(Math.max(f.anticipoMinimo, f.anticipoPredefinito));
  const [mesi, setMesi] = useState(f.durataPredefinita);
  const e = useMemo(() => esempioFinanziamento(prezzo, anticipo, mesi, f), [prezzo, anticipo, mesi, f]);
  const max = Math.min(80, Math.floor((1 - f.importoMinimo / prezzo) * 100));
  if (!e) return null;
  const scegli = () => {
    window.dispatchEvent(new CustomEvent<SceltaFinanziamento>(EVENTO_FINANZIAMENTO, { detail: { anticipo: e.anticipo, mesi: e.mesi, rata: e.rata, taeg: e.taeg } }));
    document.getElementById("offerta")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <section className="vt-box vt-fin" aria-labelledby="t-fin">
      <h2 id="t-fin">Calcola il finanziamento</h2>
      <div className="vt-fin-controlli">
        <label>
          <span>
            Anticipo <b>{anticipo}%</b> · {eur(e.anticipo, 0)}
          </span>
          <input type="range" min={f.anticipoMinimo} max={Math.max(f.anticipoMinimo, max)} step={5} value={anticipo} onChange={(x) => setAnticipo(Number(x.target.value))} />
        </label>
        <div className="vt-fin-durate" role="radiogroup" aria-label="Durata in mesi">
          {f.durate.map((d) => (
            <button key={d} type="button" role="radio" aria-checked={d === mesi} className={d === mesi ? "on" : ""} onClick={() => setMesi(d)}>
              {d} mesi
            </button>
          ))}
        </div>
      </div>
      <div className="vt-fin-esito">
        <div>
          <small>Rata mensile</small>
          <b>{eur(e.rata)}</b>
        </div>
        <div>
          <small>TAEG</small>
          <b>{perc(e.taeg)}</b>
        </div>
      </div>
      <dl className="vt-fin-dati">
        <div><dt>Prezzo in contanti</dt><dd>{eur(e.prezzo, 0)}</dd></div>
        <div><dt>Anticipo</dt><dd>{eur(e.anticipo, 0)}</dd></div>
        <div><dt>Importo totale del credito</dt><dd>{eur(e.credito, 0)}</dd></div>
        <div><dt>Durata</dt><dd>{e.mesi} rate mensili</dd></div>
        <div><dt>TAN fisso</dt><dd>{perc(e.tan)}</dd></div>
        <div><dt>TAEG</dt><dd><b>{perc(e.taeg)}</b></dd></div>
        <div><dt>Spese di istruttoria</dt><dd>{eur(f.speseIstruttoria)}</dd></div>
        <div><dt>Spese di incasso rata</dt><dd>{eur(f.speseIncasso)} (incluse nella rata)</dd></div>
        <div><dt>Imposta di bollo/sostitutiva</dt><dd>{eur(f.impostaBollo)}</dd></div>
        <div><dt>Importo totale dovuto</dt><dd>{eur(e.totaleDovuto)}</dd></div>
      </dl>
      <button type="button" className="vt-btn vt-btn-blu" style={{ width: "100%", justifyContent: "center" }} onClick={scegli}>
        Voglio questa rata: mandatemi l&apos;offerta
      </button>
      <p className="vt-fin-avviso">Attenzione! Prendere in prestito denaro costa denaro.</p>
      <p className="vt-fin-legale">
        Messaggio pubblicitario con finalità promozionale. Esempio rappresentativo calcolato sul prezzo in contanti del mezzo, tasso fisso. Finanziamento offerto da {f.finanziaria} ({f.contatti}), salvo approvazione della finanziaria. Le informazioni europee di base sul credito ai consumatori (SECCI) e le condizioni contrattuali sono disponibili in sede.
        {fine ? ` Offerta valida fino al ${fine.split("-").reverse().join("/")}.` : ""}
      </p>
    </section>
  );
}
