"use client";

import { useEffect, useState } from "react";
import { LandingView, type FooterData } from "@/components/landing/landing-view";
import type { Blocco } from "@/types/landing";

/** Anteprima dentro l'editor: riceve i blocchi aggiornati con postMessage (stessa origine). */
export function PreviewClient({ iniziali, footer, titolo, reparto }: { iniziali: Blocco[]; footer: FooterData; titolo: string; reparto: string }) {
  const [blocks, setBlocks] = useState(iniziali);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "ng-preview") return;
      // Si accettano anche blocchi incompleti (si sta scrivendo), ma solo con la forma giusta.
      const parsed = Array.isArray(e.data.blocks) ? (e.data.blocks as Blocco[]).filter((b) => b && typeof b === "object" && "tipo" in b) : [];
      setBlocks(parsed);
    };
    window.addEventListener("message", on);
    window.parent?.postMessage({ type: "ng-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", on);
  }, []);
  return (
    <>
      <div className="sticky top-0 z-40 bg-[#B8892F] py-1 text-center text-[12px] font-bold uppercase tracking-wide text-[#0C1A30]">Anteprima · non visibile al pubblico</div>
      <LandingView blocks={blocks} footer={footer} form={{ slug: "", variante: "A", reparto, campaignUtm: "", titolo, versioneInformativa: "", anteprima: true }} />
    </>
  );
}
