"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type PromoPubblica = { chiave: string; titolo: string; testo: string; href: string | null; cta: string };

/** Riquadro piccolo in basso a destra. Si chiude con la X e non torna per quel visitatore finché l'avviso non cambia. */
export function PopupPromo({ promo }: { promo: PromoPubblica }) {
  const [visibile, setVisibile] = useState(false);
  const chiave = `vt-promo-${promo.chiave}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(chiave)) return;
    } catch {}
    const t = setTimeout(() => setVisibile(true), 4000);
    return () => clearTimeout(t);
  }, [chiave]);

  const chiudi = () => {
    setVisibile(false);
    try {
      localStorage.setItem(chiave, "1");
    } catch {}
  };

  if (!visibile) return null;
  return (
    <aside className="vt-promo" role="dialog" aria-label="Avviso" aria-live="polite">
      <button type="button" className="vt-promo-x" onClick={chiudi} aria-label="Chiudi avviso">
        <X size={18} />
      </button>
      <b>{promo.titolo}</b>
      {promo.testo && <p>{promo.testo}</p>}
      {promo.href && (
        <Link href={promo.href} className="vt-btn vt-btn-giallo" onClick={chiudi}>
          {promo.cta}
        </Link>
      )}
    </aside>
  );
}
