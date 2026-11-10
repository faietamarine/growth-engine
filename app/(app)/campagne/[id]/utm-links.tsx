"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { Channel } from "@/db/schema";
import { CHANNEL_LABEL } from "@/lib/labels";
import { utmQuery } from "@/lib/campaigns/utm";

/** Link con UTM per ogni canale: da usare negli annunci, nelle email e nei QR. */
export function UtmLinks({ base, utm, canali }: { base: string; utm: string; canali: Channel[] }) {
  const [copiato, setCopiato] = useState<string | null>(null);
  async function copia(testo: string, k: string) {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(k);
      setTimeout(() => setCopiato(null), 1800);
    } catch {
      window.prompt("Copia il link:", testo);
    }
  }
  return (
    <ul className="divide-y divide-line">
      {canali.map((c) => {
        const url = `${base}?${utmQuery(c, utm)}`;
        return (
          <li key={c} className="flex items-center gap-3 py-2">
            <span className="w-24 shrink-0 text-[13px] font-semibold">{CHANNEL_LABEL[c]}</span>
            <code className="min-w-0 flex-1 truncate rounded bg-hover px-2 py-1 font-mono text-[11.5px] text-ink-soft" title={url}>
              {url}
            </code>
            <button type="button" onClick={() => copia(url, c)} className="btn-ghost btn-sm shrink-0" aria-label={`Copia il link per ${CHANNEL_LABEL[c]}`}>
              {copiato === c ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copiato === c ? "Copiato" : "Copia"}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
