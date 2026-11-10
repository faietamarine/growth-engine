import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getPublicLanding } from "@/features/landing/service";
import { getSiteSettings } from "@/features/settings/service";
import { LandingView } from "@/components/landing/landing-view";
import { CookieConsent, VisitBeacon } from "@/components/landing/consent";
import { AB_COOKIE, applicaVariante } from "@/lib/landing/ab";
import type { Blocco } from "@/types/landing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await getPublicLanding((await params).slug);
  const hero = d?.landing.publishedBlocks?.find((b): b is Extract<Blocco, { tipo: "hero" }> => b.tipo === "hero");
  return {
    title: { absolute: d ? `${d.landing.title} · Faieta Marine` : "Faieta Marine" },
    description: hero?.sottotitolo || hero?.headline,
    openGraph: hero ? { title: hero.headline, description: hero.sottotitolo, images: hero.immagine ? [hero.immagine] : ["/brand/faieta-marine.png"] } : undefined,
  };
}

export default async function LandingPubblica({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getPublicLanding(slug);
  if (!d) notFound();
  const s = await getSiteSettings();
  const footer = { nomeCommerciale: s.nomeCommerciale, ragioneSociale: s.ragioneSociale, indirizzo: s.indirizzo, partitaIva: s.partitaIva, telefono: s.telefono };

  if (d.landing.status !== "PUBBLICATO") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-[#0C1A30] px-6 text-center text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/faieta-marine.png" alt="Faieta Marine" width={110} height={55} className="mb-6 h-auto" />
        <h1 className="text-[24px] font-bold">Questa pagina non è più disponibile</h1>
        <p className="mt-2 max-w-md text-white/75">L&apos;iniziativa è terminata o sospesa. Per informazioni contattaci{s.telefono ? ` al ${s.telefono}` : ""}.</p>
        <p className="mt-1 text-white/60">{s.indirizzo}</p>
      </main>
    );
  }

  const ab = d.landing.abTest;
  const variante: "A" | "B" = ab?.attivo && (await cookies()).get(AB_COOKIE)?.value === "B" ? "B" : "A";
  const blocks = applicaVariante(d.landing.publishedBlocks!, ab, variante);
  return (
    <>
      <LandingView
        blocks={blocks}
        footer={footer}
        form={{ slug, variante, reparto: d.landing.reparto, campaignUtm: d.campaignUtm, titolo: d.landing.title, versioneInformativa: s.versioneInformativa }}
      />
      <VisitBeacon slug={slug} variante={variante} />
      <CookieConsent ids={{ metaPixelId: s.metaPixelId, ga4Id: s.ga4Id, gtmId: s.gtmId }} />
    </>
  );
}
