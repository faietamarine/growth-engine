"use client";

import { useMemo, useState } from "react";
import { esempioFinanziamento, type ImpostazioniFinanziamento } from "@/lib/vetrina/finanziamento";

const eur = (n: number) => `${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" } as Intl.NumberFormatOptions)} €`;

/** Calcolatore interno (telefonata o banco in sede): rata, TAEG e totale con i dati della finanziaria. Non è sul sito. */
export function CalcolatoreRata({ f }: { f: ImpostazioniFinanziamento }) {
  const [prezzo, setPrezzo] = useState(30000);
  const [acconto, setAcconto] = useState(Math.round((30000 * f.anticipoPredefinito) / 100));
  const [mesi, setMesi] = useState(f.durataPredefinita);
  const perc = prezzo > 0 ? (acconto / prezzo) * 100 : 0;
  const e = useMemo(() => (f.tan > 0 && prezzo > 0 ? esempioFinanziamento(prezzo, perc, mesi, f) : null), [prezzo, perc, mesi, f]);
  if (f.tan <= 0) return <p className="text-[13px] text-ink-soft">Inserisci e salva il TAN dell&apos;offerta della finanziaria per usare il calcolatore.</p>;
  return (
    <div className="space-y-3 text-[13px]">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="font-medium">
          Prezzo (€)
          <input className="input mt-1" inputMode="numeric" value={prezzo || ""} onChange={(x) => setPrezzo(Number(x.target.value.replace(/\D/g, "")) || 0)} />
        </label>
        <label className="font-medium">
          Acconto e permuta (€)
          <input className="input mt-1" inputMode="numeric" value={acconto || ""} onChange={(x) => setAcconto(Number(x.target.value.replace(/\D/g, "")) || 0)} />
        </label>
        <label className="font-medium">
          Durata
          <select className="input mt-1" value={mesi} onChange={(x) => setMesi(Number(x.target.value))}>
            {f.durate.map((d) => (
              <option key={d} value={d}>
                {d} mesi
              </option>
            ))}
          </select>
        </label>
      </div>
      {e ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-navy/5 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">Rata mensile</p>
              <p className="num font-display text-[22px] font-bold">{eur(e.rata)}</p>
            </div>
            <div className="rounded-xl bg-navy/5 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">TAEG</p>
              <p className="num font-display text-[22px] font-bold">{e.taeg.toLocaleString("it-IT", { minimumFractionDigits: 2 })}%</p>
            </div>
          </div>
          <p className="text-ink-soft">
            Credito {eur(e.credito)} · TAN {e.tan.toLocaleString("it-IT", { minimumFractionDigits: 2 })}% · {e.mesi} rate · totale dovuto {eur(e.totaleDovuto)} · costo del credito {eur(e.costoCredito)}
          </p>
          {e.credito < f.importoMinimo && <p className="text-danger">Sotto l&apos;importo minimo finanziabile ({eur(f.importoMinimo)}).</p>}
          {perc < f.anticipoMinimo && <p className="text-danger">Acconto sotto il minimo richiesto ({f.anticipoMinimo}%).</p>}
          <p className="text-ink-faint">Indicativo: la rata definitiva la conferma la finanziaria in sede.</p>
        </>
      ) : (
        <p className="text-ink-soft">L&apos;acconto copre tutto il prezzo: niente da finanziare.</p>
      )}
    </div>
  );
}
