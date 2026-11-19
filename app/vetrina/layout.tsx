import type { Metadata } from "next";
import Link from "next/link";
import "./vetrina.css";
import { CookieConsent } from "@/components/landing/consent";
import { getSiteSettings } from "@/features/settings/service";
import { getVetrinaSettings, promoInCorso } from "@/features/vetrina/service";
import { BarraScelte } from "@/components/vetrina/barra-scelte";
import { WhatsAppTesta } from "@/components/vetrina/whatsapp";
import { MenuMobile } from "@/components/vetrina/menu-mobile";
import { Phone } from "lucide-react";
import { eventiInArrivo, postPubblici } from "@/features/vetrina/contenuti";
import { parteIndirizzo, siteUrl } from "@/lib/seo/site";
import { PopupPromo } from "@/components/vetrina/popup-promo";
import { etichettaCta } from "@/lib/vetrina/promo";
import { SEZIONI_SITO } from "@/lib/vetrina/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Faieta Marine · Barche, gommoni, moto d'acqua e motori a Pescara", template: "%s · Faieta Marine" },
  description: "Faieta Marine: vendita, assistenza e rimessaggio a Pescara. Barche, gommoni, moto d'acqua e motori: pronte consegne, catalogo e usato. Joker Boat, Jeanneau, Capelli, Yamaha, Invictus, Capoforte.",
  robots: { index: true, follow: true },
  openGraph: { siteName: "Faieta Marine", locale: "it_IT", type: "website", images: ["/brand/faieta-marine.png"] },
  twitter: { card: "summary_large_image" },
};

export default async function VetrinaLayout({ children }: { children: React.ReactNode }) {
  const [s, v, promo, eventi, articoli] = await Promise.all([getSiteSettings(), getVetrinaSettings(), promoInCorso(), eventiInArrivo(1), postPubblici(1)]);
  // Blog ed Eventi compaiono nel menu solo quando hanno contenuti: una sezione vuota fa sembrare l'azienda ferma.
  const voci = [
    ...SEZIONI_SITO.map((c) => ({ href: `/vetrina/mezzi?condizione=${c.slug}`, nome: c.id === "USATO" ? "Usato" : c.titolo })),
    { href: "/vetrina#marchi", nome: "Marchi" },
    ...(eventi.length ? [{ href: "/vetrina/eventi", nome: "Eventi" }] : []),
    ...(articoli.length ? [{ href: "/vetrina/blog", nome: "Blog" }] : []),
    { href: "/vetrina/servizi", nome: "Assistenza" },
    { href: "/vetrina/valuta", nome: "Valuta il tuo usato" },
  ];
  const vociMobile = [...voci, { href: "/vetrina/quiz", nome: "Trova la tua barca" }];
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
            {voci.map((x) => (
              <Link key={x.href} href={x.href}>
                {x.nome}
              </Link>
            ))}
          </nav>
          <div className="vt-head-azioni">
            <a href={telHref} className="vt-ico-btn" aria-label={`Chiamaci: ${v.telefono}`} title={`Chiamaci: ${v.telefono}`}>
              <Phone size={20} aria-hidden />
            </a>
            {v.whatsapp && <WhatsAppTesta numero={v.whatsapp} />}
            <Link href="/vetrina#appuntamento" className="vt-btn vt-btn-giallo vt-head-cta">
              Prenota visita
            </Link>
            <MenuMobile voci={vociMobile} telHref={telHref} />
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
                  <a href={telHref}>Tel. {v.telefono}</a>
                </li>
                {v.whatsapp && (
                  <li>
                    <a href={`https://wa.me/${v.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener">
                      WhatsApp
                    </a>
                  </li>
                )}
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
                  <Link href="/vetrina/servizi">Assistenza e preventivi</Link>
                </li>
                {eventi.length > 0 && (
                  <li>
                    <Link href="/vetrina/eventi">Eventi e prove in mare</Link>
                  </li>
                )}
                {articoli.length > 0 && (
                  <li>
                    <Link href="/vetrina/blog">Blog</Link>
                  </li>
                )}
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
