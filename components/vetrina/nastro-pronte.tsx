"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Ship } from "lucide-react";

export type VoceNastro = { id: string; marca: string; modello: string; foto: string | null; prezzo: string; listino: string | null; risparmio: string | null; etichetta: string };

/**
 * Annunci di pronta consegna che scorrono in verticale nel banner (uno alla volta, ogni 3,5 secondi).
 * Si ferma quando il mouse o il dito ci sono sopra; chi ha chiesto meno animazioni vede l'elenco fermo.
 */
export function NastroPronte({ voci }: { voci: VoceNastro[] }) {
  const [i, setI] = useState(0);
  const [salto, setSalto] = useState(false);
  const [fermo, setFermo] = useState(false);
  const [statico, setStatico] = useState(false);
  const pausa = useRef(false);
  const scorre = voci.length > 1 && !statico;

  useEffect(() => {
    setStatico(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  useEffect(() => {
    if (!scorre) return;
    const t = setInterval(() => {
      if (!pausa.current && !document.hidden) setI((x) => x + 1);
    }, 3500);
    return () => clearInterval(t);
  }, [scorre]);
  // Arrivati alle copie in fondo si torna all'inizio senza animazione: il giro sembra infinito.
  useEffect(() => {
    if (i < voci.length) return;
    const t = setTimeout(() => {
      setSalto(true);
      setI(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setSalto(false)));
    }, 650);
    return () => clearTimeout(t);
  }, [i, voci.length]);

  const elenco = scorre ? [...voci, ...voci.slice(0, 3)] : voci;
  return (
    <div
      className={`vt-nastro${scorre ? "" : " vt-nastro-fermo"}`}
      onMouseEnter={() => ((pausa.current = true), setFermo(true))}
      onMouseLeave={() => ((pausa.current = false), setFermo(false))}
      onFocus={() => (pausa.current = true)}
      onBlur={() => (pausa.current = false)}
      onTouchStart={() => (pausa.current = true)}
      onTouchEnd={() => setTimeout(() => (pausa.current = false), 2500)}
    >
      <div className="vt-nastro-testa">
        <span className="vt-nastro-punto" aria-hidden />
        Pronta consegna in promo
        {fermo && scorre && <span className="vt-nastro-pausa">in pausa</span>}
        <Link href="/vetrina/mezzi?condizione=pronta-consegna" className="vt-nastro-tutti">
          Vedi tutte →
        </Link>
      </div>
      <div className="vt-nastro-finestra">
        <ul className="vt-nastro-lista" style={{ ["--i" as string]: i, transition: salto ? "none" : undefined }} aria-live="off">
          {elenco.map((v, k) => (
            <li key={`${v.id}-${k}`} aria-hidden={k >= voci.length || undefined}>
              <Link href={`/vetrina/mezzo/${v.id}`} className="vt-nastro-voce" tabIndex={k >= voci.length ? -1 : undefined}>
                <span className="vt-nastro-foto">
                  {v.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/media/${v.foto}`} alt="" loading="lazy" />
                  ) : (
                    <Ship size={28} aria-hidden />
                  )}
                  {v.etichetta && <span className="vt-nastro-tag">{v.etichetta}</span>}
                </span>
                <span className="vt-nastro-testo">
                  <span className="vt-nastro-marca">{v.marca}</span>
                  <b>{v.modello}</b>
                  <span className="vt-nastro-prezzi">
                    {v.listino && <s>{v.listino}</s>}
                    <strong>{v.prezzo}</strong>
                  </span>
                  {v.risparmio && <span className="vt-nastro-risp">Risparmi {v.risparmio}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
