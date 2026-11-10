"use client";

import { useEffect, useState } from "react";

export type TrackingIds = { metaPixelId: string; ga4Id: string; gtmId: string };

const CHIAVE = "ng_consenso";

function leggi(): "si" | "no" | null {
  try {
    const v = localStorage.getItem(CHIAVE);
    return v === "si" || v === "no" ? v : null;
  } catch {
    return null;
  }
}

function carica(src: string, inline?: string) {
  if (inline) {
    const s = document.createElement("script");
    s.text = inline;
    document.head.appendChild(s);
  }
  if (src) {
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }
}

/** Attiva Meta Pixel, Google Analytics e Tag Manager SOLO dopo il consenso (ID validati lato server). */
function attivaTracciamento(ids: TrackingIds) {
  const w = window as unknown as { __ngTracking?: boolean };
  if (w.__ngTracking) return;
  w.__ngTracking = true;
  if (ids.metaPixelId)
    carica(
      "",
      `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${ids.metaPixelId}');fbq('track','PageView');`,
    );
  if (ids.ga4Id) carica(`https://www.googletagmanager.com/gtag/js?id=${ids.ga4Id}`, `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ids.ga4Id}');`);
  if (ids.gtmId) carica(`https://www.googletagmanager.com/gtm.js?id=${ids.gtmId}`, `window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});`);
}

export function CookieConsent({ ids, anteprima = false }: { ids: TrackingIds; anteprima?: boolean }) {
  const [aperto, setAperto] = useState(false);
  const serve = !!(ids.metaPixelId || ids.ga4Id || ids.gtmId);

  useEffect(() => {
    if (!serve || anteprima) return;
    const c = leggi();
    if (c === "si") attivaTracciamento(ids);
    else if (c === null) setAperto(true);
    const riapri = () => setAperto(true);
    window.addEventListener("ng:preferenze-cookie", riapri);
    return () => window.removeEventListener("ng:preferenze-cookie", riapri);
  }, [ids, serve, anteprima]);

  if (!aperto) return null;
  const scegli = (v: "si" | "no") => {
    try {
      localStorage.setItem(CHIAVE, v);
    } catch {}
    setAperto(false);
    if (v === "si") attivaTracciamento(ids);
    else if ((window as unknown as { __ngTracking?: boolean }).__ngTracking) window.location.reload(); // revoca: si ricarica senza script
  };
  return (
    <div role="dialog" aria-label="Preferenze cookie" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border border-[#E1E4E9] bg-white p-4 text-[14px] text-[#1A1F29] shadow-[0_12px_32px_rgba(10,20,40,.22)]">
      <p>
        Usiamo cookie tecnici necessari e, solo con il tuo consenso, strumenti di Meta e Google per misurare le visite e mostrarti annunci pertinenti.{" "}
        <a href="/l/privacy" target="_blank" rel="noopener" className="font-semibold text-[#0F2340] underline">
          Informativa
        </a>
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => scegli("no")} className="flex-1 rounded-lg border border-[#C9CED6] px-4 py-2.5 font-semibold">
          Rifiuta
        </button>
        <button type="button" onClick={() => scegli("si")} className="flex-1 rounded-lg bg-[#0F2340] px-4 py-2.5 font-semibold text-white">
          Accetta
        </button>
      </div>
    </div>
  );
}

export function PreferenzeCookieLink() {
  return (
    <button type="button" className="underline" onClick={() => window.dispatchEvent(new Event("ng:preferenze-cookie"))}>
      Preferenze cookie
    </button>
  );
}

/** Conta una visita per sessione (solo pagine pubblicate, non in anteprima). */
export function VisitBeacon({ slug, variante }: { slug: string; variante: "A" | "B" }) {
  useEffect(() => {
    const k = `ngv_${slug}`;
    try {
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch {}
    fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ slug, variante }), keepalive: true }).catch(() => {});
  }, [slug, variante]);
  return null;
}
