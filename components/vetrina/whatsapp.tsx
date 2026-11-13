"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { messaggioWhatsApp } from "@/lib/seo/site";

/** Pulsante WhatsApp fisso: il messaggio parte già scritto con il nome della pagina (es. il mezzo che stai guardando). */
export function WhatsAppFisso({ numero }: { numero: string }) {
  usePathname(); // si aggiorna a ogni cambio pagina
  const titolo = typeof document !== "undefined" ? document.title.replace(/\s*·\s*Faieta Marine.*$/, "").trim() : "";
  const specifico = typeof window !== "undefined" && /^\/vetrina\/(mezzo|marchi)\//.test(window.location.pathname) ? titolo : "";
  const href = `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(messaggioWhatsApp(specifico))}`;
  return (
    <a className="vt-wa" href={href} target="_blank" rel="noopener" aria-label="Scrivici su WhatsApp">
      <MessageCircle size={30} color="#fff" aria-hidden />
    </a>
  );
}
