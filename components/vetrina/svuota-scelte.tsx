"use client";

import { useRouter } from "next/navigation";
import { useScelte } from "./scelte";

export function SvuotaScelte({ chiave, max, percorso }: { chiave: "vt-preferiti" | "vt-confronto"; max: number; percorso: string }) {
  const s = useScelte(chiave, max);
  const router = useRouter();
  return (
    <button type="button" className="vt-btn vt-btn-blu" onClick={() => { s.svuota(); router.replace(percorso); }}>
      Svuota l&apos;elenco
    </button>
  );
}
