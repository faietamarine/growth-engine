import type { Metadata } from "next";
import Link from "next/link";
import "./vetrina.css";
import { CookieConsent } from "@/components/landing/consent";
import { getSiteSettings } from "@/features/settings/service";
import { getVetrinaSettings, promoInCorso } from "@/features/vetrina/service";
import { BarraScelte } from "@/components/vetrina/barra-scelte";
import { WhatsAppFisso } from "@/components/vetrina/whatsapp";
import { parteIndirizzo, siteUrl } from "@/lib/seo/site";
import { PopupPromo } from "@/components/vetrina/popup-promo";
import { etichettaCta } from "@/lib/vetrina/promo";
import { SEZIONI_SITO } from "@/lib/vetrina/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Faieta Marine · Barche nuove e usate a Pescara", template: "%s · Faieta Marine" },
  description: "Pronte consegne, catalogo da ordinare e usato selezionato. Joker Boat, Jeanneau, Capelli, Yamaha, Invictus, Capoforte. Prenota la tua visita a Pescara.",
  robots: { index: true, follow: true },
  openGraph: { siteName: "Faieta Marine", locale: "it_IT", type: "website", images: ["/brand/faieta-marine.png"] },
  twitter: { card: "summary_large_image" },
};

export default async function VetrinaLayout({ children }: { children: React.ReactNode }) {
  const [s, v, promo] = await Promise.all([getSiteSettings(), getVetrinaSettings(), promoInCorso()]);
  const tel = v.telefono.replace(/[^\d+]/g, "");
  const telHref = `tel:${tel.startsWith("+") ? tel : `+39${tel}`}`;
  const azienda = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: s.ragioneSociale || "Faieta Marine",
    url: siteUrl(),
    logo: `${siteUrl()}/brand/faieta-marine.png`,
    image: `${siteUrl()}/brand/faieta-marine.png`,
    telephone: telHref.replace("tel:", ""),
    email: v.email,
    address: { "@type": "PostalAddress", ...parteIndirizzo(v.indirizzo) },
    brand: ["Joker Boat", "Jeanneau", "Capelli", "Yamaha", "Invictus", "Capoforte", "Italmar"].map((name) => ({ "@type": "Brand", name })),
    areaServed: "Abruzzo",
  };
  return (
    <div className="vt">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(azienda).replace(/</g, "\\u003c") }} />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" />
      <header className="vt-head">
        <div className="vt-wrap">
          <Link href="/vetrina" className="vt-logo" aria-label="Faieta Marine, home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/faieta-marine.png" alt="Faieta Marine" width={88} height={44} />
          </Link>
          <nav className="vt-nav" aria-label="Sezioni del sito">
            {SEZIONI_SITO.map((c) => (
              <Link key={c.id} href={`/vetrina/mezzi?condizione=${c.slug}`}>
                {c.titolo}
              </Link>
            ))}
            <Link href="/vetrina#marchi">I nostri marchi</Link>
            <Link href="/vetrina/quiz">Trova la tua barca</Link>
            <Link href="/vetrina/valuta">Valuta la tua barca</Link>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <a href={telHref} className="vt-tel">
              {v.telefono}
            </a>
            <Link href="/vetrina#appuntamento" className="vt-btn vt-btn-giallo vt-head-cta">
              Prenota visita
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="vt-piede">
        <div className="vt-wrap">
          <div className="vt-piede-gr">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/faieta-marine.png" alt="Faieta Marine" width={96} height={48} style={{ height: 48, width: "auto", marginBottom: 12, background: "#fff", borderRadius: 10, padding: "6px 10px" }} />
              <p style={{ margin: 0 }}>{v.indirizzo}</p>
            </div>
            <div>
              <h4>Contatti</h4>
              <ul>
                <li>
                  <a href={telHref}>{v.telefono}</a>
                </li>
                <li>
                  <a href={`mailto:${v.email}`}>{v.email}</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Il sito</h4>
              <ul>
                {SEZIONI_SITO.map((c) => (
                  <li key={c.id}>
                    <Link href={`/vetrina/mezzi?condizione=${c.slug}`}>{c.titolo}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/vetrina/quiz">Trova la tua barca</Link>
                </li>
                <li>
                  <Link href="/vetrina/valuta">Valuta la tua barca</Link>
                </li>
                <li>
                  <Link href="/l/privacy">Informativa privacy</Link>
                </li>
              </ul>
            </div>
          </div>
          <small>
            © {new Date().getFullYear()} {s.ragioneSociale || "Faieta Marine"}
            {s.partitaIva ? ` · P.IVA ${s.partitaIva}` : ""}
          </small>
        </div>
      </footer>
      <BarraScelte />
      {v.whatsapp && (
        <WhatsAppFisso numero={v.whatsapp} />
      )}
      {promo && (
        <PopupPromo
          promo={{
            chiave: `${promo.id}-${promo.updatedAt.getTime?.() ?? promo.updatedAt}`,
            titolo: promo.titolo,
            testo: promo.testo,
            href: promo.ctaTipo === "VISITA" ? "/vetrina#appuntamento" : promo.ctaTipo === "MEZZO" && promo.mezzoId ? `/vetrina/mezzo/${promo.mezzoId}` : null,
            cta: etichettaCta(promo),
          }}
        />
      )}
      <CookieConsent ids={{ metaPixelId: s.metaPixelId, ga4Id: s.ga4Id, gtmId: s.gtmId }} />
    </div>
  );
}
