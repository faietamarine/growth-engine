"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Sul telefono: "Prenota la tua visita" sempre a portata di pollice dopo il banner; sparisce quando sei già sul modulo. */
export function BarraPrenota() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const modulo = document.getElementById("appuntamento");
    const aggiorna = () => {
      const r = modulo?.getBoundingClientRect();
      const sulModulo = !!r && r.top < window.innerHeight && r.bottom > 0;
      setOn(window.scrollY > 560 && !sulModulo);
    };
    aggiorna();
    window.addEventListener("scroll", aggiorna, { passive: true });
    return () => window.removeEventListener("scroll", aggiorna);
  }, []);
  return (
    <div className={`vt-barra-prenota${on ? " on" : ""}`} aria-hidden={!on}>
      <Link href="#appuntamento" className="vt-btn vt-btn-giallo" tabIndex={on ? undefined : -1}>
        Prenota la tua visita
      </Link>
    </div>
  );
}
