"use client";

import { useEffect } from "react";

/** Ricorda da dove è arrivato il visitatore (es. catalogo WhatsApp) anche se poi cambia pagina prima di scrivere. */
export function RicordaUtm() {
  useEffect(() => {
    try {
      const p = new URL(window.location.href).searchParams;
      const utm = Object.fromEntries(["source", "medium", "campaign", "content", "term"].map((k) => [k, p.get(`utm_${k}`)]).filter(([, v]) => v));
      if (Object.keys(utm).length) sessionStorage.setItem("vt-utm", JSON.stringify(utm));
    } catch {}
  }, []);
  return null;
}
