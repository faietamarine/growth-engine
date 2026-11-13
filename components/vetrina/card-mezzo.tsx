import Link from "next/link";
import { Ship } from "lucide-react";
import type { Vehicle } from "@/db/schema";
import { getMarchio } from "@/lib/brands/catalog";
import { CONDIZIONI, euro, metri } from "@/lib/vetrina/catalog";

export function CardMezzo({ m }: { m: Vehicle }) {
  const marca = getMarchio(m.marca)?.nome ?? m.marca;
  const cond = CONDIZIONI.find((c) => c.id === m.condizione);
  const venduto = m.stato === "VENDUTO";
  return (
    <Link href={`/vetrina/mezzo/${m.id}`} className="vt-card">
      <div className="vt-card-foto">
        {m.foto[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${m.foto[0]}`} alt={`${marca} ${m.modello}`} loading="lazy" />
        ) : (
          <div className="vt-nofoto">
            <Ship size={44} />
          </div>
        )}
        <span className={`vt-tag${venduto ? " vt-venduto" : ""}`}>{venduto ? "Venduto" : (cond?.nome ?? "")}</span>
      </div>
      <div className="vt-card-corpo">
        <span className="vt-card-marca">{marca}</span>
        <h3>{m.modello}</h3>
        <div className="vt-dati">
          {m.anno && <span>{m.anno}</span>}
          {m.lunghezza && <span>{metri(m.lunghezza)}</span>}
          {m.motore && <span>{m.motore}</span>}
          {m.ore != null && <span>{m.ore} ore</span>}
        </div>
        <div className="vt-prezzo">{m.prezzo == null ? <small>Prezzo su richiesta</small> : euro(m.prezzo)}</div>
      </div>
    </Link>
  );
}
