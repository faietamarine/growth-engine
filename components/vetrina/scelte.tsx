"use client";
import { useCallback, useEffect, useState } from "react";

/* Preferiti e confronto: restano sul telefono del cliente (localStorage), senza registrazione. */
const EVENTO = "vt-scelte";

function leggi(chiave: string): string[] {
  try {
    const a = JSON.parse(localStorage.getItem(chiave) ?? "[]");
    return Array.isArray(a) ? a.filter((x) => typeof x === "string").slice(0, 60) : [];
  } catch {
    return [];
  }
}
function scrivi(chiave: string, v: string[]) {
  try {
    localStorage.setItem(chiave, JSON.stringify(v));
    window.dispatchEvent(new Event(EVENTO));
  } catch {}
}

export function useScelte(chiave: "vt-preferiti" | "vt-confronto", max: number) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const agg = () => setIds(leggi(chiave));
    agg();
    window.addEventListener(EVENTO, agg);
    window.addEventListener("storage", agg);
    return () => {
      window.removeEventListener(EVENTO, agg);
      window.removeEventListener("storage", agg);
    };
  }, [chiave]);
  const tocca = useCallback(
    (id: string) => {
      const att = leggi(chiave);
      if (att.includes(id)) return scrivi(chiave, att.filter((x) => x !== id));
      // al riempimento del confronto si sostituisce il più vecchio
      scrivi(chiave, [...att, id].slice(-max));
    },
    [chiave, max],
  );
  const svuota = useCallback(() => scrivi(chiave, []), [chiave]);
  return { ids, tocca, svuota, ha: (id: string) => ids.includes(id) };
}
