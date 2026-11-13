"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Se la pagina si apre senza ?ids= prende l'elenco salvato sul telefono. */
export function ScelteRedirect({ chiave, percorso }: { chiave: string; percorso: string }) {
  const router = useRouter();
  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem(chiave) ?? "[]");
      if (Array.isArray(a) && a.length) router.replace(`${percorso}?ids=${a.join(",")}`);
    } catch {}
  }, [chiave, percorso, router]);
  return null;
}
