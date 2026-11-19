"use client";

import { usePathname } from "next/navigation";
import { messaggioWhatsApp } from "@/lib/seo/site";

/** Simbolo WhatsApp (uso consentito per i pulsanti "scrivici su WhatsApp"). */
export function IconaWhatsApp({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.44 9.44 0 0 1-1.45-5.04c0-5.22 4.25-9.47 9.48-9.47a9.4 9.4 0 0 1 6.7 2.78 9.42 9.42 0 0 1 2.77 6.7c0 5.23-4.25 9.47-9.47 9.47zm8.06-17.54A11.33 11.33 0 0 0 12.04.62C5.76.62.65 5.73.65 12.01c0 2.01.52 3.97 1.52 5.7L.55 23.62l6.04-1.59a11.37 11.37 0 0 0 5.44 1.39h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.33-8.05z" />
    </svg>
  );
}

/** Pulsante WhatsApp nella testata: il messaggio parte già scritto con il nome della pagina (es. il mezzo che stai guardando). */
export function WhatsAppTesta({ numero }: { numero: string }) {
  usePathname(); // si aggiorna a ogni cambio pagina
  const titolo = typeof document !== "undefined" ? document.title.replace(/\s*·\s*Faieta Marine.*$/, "").trim() : "";
  const specifico = typeof window !== "undefined" && /^\/vetrina\/(mezzo|marchi|eventi)\//.test(window.location.pathname) ? titolo : "";
  const href = `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(messaggioWhatsApp(specifico))}`;
  return (
    <a className="vt-ico-btn vt-ico-wa" href={href} target="_blank" rel="noopener" aria-label="Scrivici su WhatsApp" title="Scrivici su WhatsApp">
      <IconaWhatsApp />
    </a>
  );
}
