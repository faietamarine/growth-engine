"use client";

import { GitCompareArrows, Heart } from "lucide-react";
import { useScelte } from "./scelte";
import { MAX_CONFRONTO, MAX_PREFERITI } from "@/lib/vetrina/limiti";

/** Cuore (preferiti) e "Confronta" su una card o sulla scheda di un mezzo. */
export function AzioniMezzo({ id, esteso = false }: { id: string; esteso?: boolean }) {
  const pref = useScelte("vt-preferiti", MAX_PREFERITI);
  const conf = useScelte("vt-confronto", MAX_CONFRONTO);
  const p = pref.ha(id);
  const c = conf.ha(id);
  return (
    <div className={esteso ? "vt-azioni vt-azioni-est" : "vt-azioni"}>
      <button type="button" className={`vt-az${p ? " on" : ""}`} aria-pressed={p} aria-label={p ? "Togli dai preferiti" : "Aggiungi ai preferiti"} onClick={() => pref.tocca(id)}>
        <Heart size={18} fill={p ? "currentColor" : "none"} />
        {esteso && <span>{p ? "Nei preferiti" : "Preferito"}</span>}
      </button>
      <button type="button" className={`vt-az${c ? " on" : ""}`} aria-pressed={c} aria-label={c ? "Togli dal confronto" : "Aggiungi al confronto"} onClick={() => conf.tocca(id)}>
        <GitCompareArrows size={18} />
        {esteso && <span>{c ? "Nel confronto" : "Confronta"}</span>}
      </button>
    </div>
  );
}
