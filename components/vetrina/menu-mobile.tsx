"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

/** Menu a tendina per il telefono: si chiude da solo quando cambi pagina. */
export function MenuMobile({ voci, telHref }: { voci: { href: string; nome: string }[]; telHref: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [path]);
  return (
    <details ref={ref} className="vt-menu-mob">
      <summary aria-label="Apri il menu">
        <Menu size={24} className="vt-menu-apri" aria-hidden />
        <X size={24} className="vt-menu-chiudi" aria-hidden />
      </summary>
      <nav aria-label="Menu del sito">
        {voci.map((v) => (
          <Link key={v.href} href={v.href} onClick={() => ref.current && (ref.current.open = false)}>
            {v.nome}
          </Link>
        ))}
        <a href={telHref}>Chiamaci</a>
        <Link href="/vetrina#appuntamento" className="vt-btn vt-btn-giallo" onClick={() => ref.current && (ref.current.open = false)}>
          Prenota visita
        </Link>
      </nav>
    </details>
  );
}
