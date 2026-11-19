"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Sul telefono: "Prenota la tua visita" sempre a portata di pollice dopo il banner; sparisce quando sei già sul modulo. */
export function BarraPrenota({ href = "#appuntamento", etichetta = "Prenota la tua visita", obiettivo = "appuntamento", soglia = 560, verde }: { href?: string; etichetta?: string; /** id del modulo: quando è visibile la barra sparisce */ obiettivo?: string; soglia?: number; /** pulsante verde WhatsApp */ verde?: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const modulo = document.getElementById(obiettivo);
    const aggiorna = () => {
      const r = modulo?.getBoundingClientRect();
      const sulModulo = !!r && r.top < window.innerHeight && r.bottom > 0;
      setOn(window.scrollY > soglia && !sulModulo);
    };
    aggiorna();
    window.addEventListener("scroll", aggiorna, { passive: true });
    return () => window.removeEventListener("scroll", aggiorna);
  }, [obiettivo, soglia]);
  return (
    <div className={`vt-barra-prenota${on ? " on" : ""}`} aria-hidden={!on}>
      <Link href={href} className={`vt-btn ${verde ? "vt-btn-wa" : "vt-btn-giallo"}`} tabIndex={on ? undefined : -1}>
        {etichetta}
      </Link>
    </div>
  );
}
