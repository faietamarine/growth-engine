"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/** Copia un testo negli appunti; se il browser non lo permette, lo mostra per la copia a mano. */
export function CopyButton({ text, label = "Copia", className = "btn-ghost btn-sm" }: { text: string; label?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        } catch {
          window.prompt("Copia il testo:", text);
        }
      }}
      aria-label={label}
    >
      {ok ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
      <span className="hidden sm:inline">{ok ? "Copiato" : label}</span>
    </button>
  );
}

/** Contatore di caratteri: rosso oltre il limite. */
export function Counter({ n, max }: { n: number; max: number }) {
  return (
    <span className={`num whitespace-nowrap text-[11px] font-semibold ${n > max ? "text-danger" : "text-ink-faint"}`} title={n > max ? `Supera il limite di ${max} caratteri` : undefined}>
      {n}/{max}
    </span>
  );
}
