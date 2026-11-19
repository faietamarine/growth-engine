import { euro, offerta } from "@/lib/vetrina/catalog";
import { oggiRoma } from "@/lib/vetrina/promo";
import type { Vehicle } from "@/db/schema";

const fine = (d: string) => {
  const [, m, g] = d.split("-").map(Number);
  return `${g}/${m}`;
};

/** Prezzo del mezzo con l'eventuale listino barrato e il risparmio in euro. */
export function PrezzoMezzo({ m, grande }: { m: Pick<Vehicle, "prezzo" | "prezzoListino" | "promo" | "promoFine" | "stato">; grande?: boolean }) {
  if (m.stato === "VENDUTO") return <div className={grande ? "vt-prezzo-gr" : "vt-prezzo"}>Venduto</div>;
  if (m.prezzo == null) return <div className={grande ? "vt-prezzo-gr" : "vt-prezzo"}>{grande ? "Prezzo su richiesta" : <small>Prezzo su richiesta</small>}</div>;
  const o = offerta(m, oggiRoma());
  return (
    <div className={`vt-prezzo-blocco${grande ? " vt-prezzo-blocco-gr" : ""}`}>
      {o?.listino && (
        <span className="vt-listino">
          Listino <s>{euro(o.listino)}</s>
        </span>
      )}
      <span className={grande ? "vt-prezzo-gr" : "vt-prezzo"} style={{ marginTop: 0, paddingTop: 0 }}>
        {euro(m.prezzo)}
      </span>
      {o?.listino && <span className="vt-risparmio">Risparmi {euro(o.risparmio)}</span>}
      {o?.scade && <span className="vt-scade">Promo valida fino al {fine(o.scade)}</span>}
    </div>
  );
}

/** Etichetta sulla foto: "Promo inverno" oppure "-8%". */
export function EtichettaPromo({ m }: { m: Pick<Vehicle, "prezzo" | "prezzoListino" | "promo" | "promoFine" | "stato"> }) {
  const o = offerta(m, oggiRoma());
  if (!o) return null;
  return <span className="vt-tag-promo">{o.etichetta || `-${o.percentuale}%`}</span>;
}
