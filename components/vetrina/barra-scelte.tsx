"use client";

import Link from "next/link";
import { GitCompareArrows, Heart } from "lucide-react";
import { useScelte } from "./scelte";
import { MAX_CONFRONTO, MAX_PREFERITI } from "@/lib/vetrina/limiti";

/** Barra in basso a sinistra: compare quando ci sono preferiti o mezzi da confrontare. */
export function BarraScelte() {
  const pref = useScelte("vt-preferiti", MAX_PREFERITI);
  const conf = useScelte("vt-confronto", MAX_CONFRONTO);
  if (!pref.ids.length && !conf.ids.length) return null;
  return (
    <div className="vt-barra-scelte" role="region" aria-label="Preferiti e confronto">
      {pref.ids.length > 0 && (
        <Link href={`/vetrina/preferiti?ids=${pref.ids.join(",")}`}>
          <Heart size={16} fill="currentColor" /> Preferiti ({pref.ids.length})
        </Link>
      )}
      {conf.ids.length > 0 &&
        (conf.ids.length >= 2 ? (
          <Link href={`/vetrina/confronto?ids=${conf.ids.join(",")}`} className="forte">
            <GitCompareArrows size={16} /> Confronta ({conf.ids.length})
          </Link>
        ) : (
          <span>
            <GitCompareArrows size={16} /> Scegline un altro da confrontare
          </span>
        ))}
    </div>
  );
}
