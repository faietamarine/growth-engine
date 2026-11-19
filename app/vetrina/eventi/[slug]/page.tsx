import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { eventoPerSlug, iscrittiPerEvento } from "@/features/vetrina/contenuti";
import { getVetrinaSettings } from "@/features/vetrina/service";
import { getSiteSettings } from "@/features/settings/service";
import { estratto, eventoFuturo, periodo, righeMezzi, TIPI_EVENTO } from "@/lib/vetrina/contenuti";
import { oggiRoma } from "@/lib/vetrina/promo";
import { parteIndirizzo, siteUrl } from "@/lib/seo/site";
import { TestoRicco } from "@/components/vetrina/testo-ricco";
import { FormEvento } from "@/components/vetrina/form-evento";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const e = await eventoPerSlug((await params).slug);
  if (!e) return { title: "Evento non trovato" };
  const descrizione = `${periodo(e.data, e.dataFine)}${e.luogo ? `, ${e.luogo}` : ""}. ${estratto(e.descrizione, 120)}`;
  return {
    title: e.titolo,
    description: descrizione,
    alternates: { canonical: `/vetrina/eventi/${e.slug}` },
    openGraph: { title: e.titolo, description: descrizione, ...(e.foto ? { images: [`/media/${e.foto}`] } : {}) },
  };
}

export default async function EventoPagina({ params }: { params: Promise<{ slug: string }> }) {
  const e = await eventoPerSlug((await params).slug);
  if (!e) notFound();
  const [iscritti, s, v] = await Promise.all([iscrittiPerEvento(), getSiteSettings(), getVetrinaSettings()]);
  const liberi = e.posti ? Math.max(0, e.posti - (iscritti[e.id] ?? 0)) : null;
  const finito = !eventoFuturo(e, oggiRoma());
  const mezzi = righeMezzi(e.mezzi);
  const quando = `${periodo(e.data, e.dataFine)}${e.orario ? `, ${e.orario}` : ""}`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.titolo,
    description: estratto(e.descrizione || e.titolo, 300),
    startDate: e.data,
    endDate: e.dataFine || e.data,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: e.luogo || "Faieta Marine", address: { "@type": "PostalAddress", ...parteIndirizzo(e.luogo || v.indirizzo) } },
    image: e.foto ? `${siteUrl()}/media/${e.foto}` : `${siteUrl()}/brand/faieta-marine.png`,
    organizer: { "@type": "Organization", name: "Faieta Marine", url: siteUrl() },
    offers: { "@type": "Offer", price: 0, priceCurrency: "EUR", availability: liberi === 0 ? "https://schema.org/SoldOut" : "https://schema.org/InStock", url: `${siteUrl()}/vetrina/eventi/${e.slug}` },
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <section className="vt-titolo-pag">
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › <Link href="/vetrina/eventi">Eventi e prove in mare</Link>
          </p>
          <p style={{ margin: "0 0 6px", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", fontSize: 13, color: "var(--giallo)" }}>{TIPI_EVENTO.find((t) => t.id === e.tipo)?.nome}</p>
          <h1>{e.titolo}</h1>
        </div>
      </section>
      <div className="vt-wrap vt-scheda" style={{ paddingTop: 28 }}>
        <div style={{ minWidth: 0 }}>
          {e.foto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/media/${e.foto}`} alt="" className="vt-articolo-foto" />
          )}
          <ul className="vt-evento-info">
            <li>
              <CalendarDays size={20} aria-hidden /> {periodo(e.data, e.dataFine)}
            </li>
            {e.orario && (
              <li>
                <Clock size={20} aria-hidden /> {e.orario}
              </li>
            )}
            {e.luogo && (
              <li>
                <MapPin size={20} aria-hidden /> {e.luogo}
              </li>
            )}
            {e.posti && (
              <li>
                <Users size={20} aria-hidden /> {liberi === 0 ? "Posti esauriti" : `${liberi} posti liberi su ${e.posti}`}
              </li>
            )}
          </ul>
          {e.descrizione && <TestoRicco testo={e.descrizione} />}
          {mezzi.length > 0 && (
            <>
              <h2 className="vt-h2-pic">Mezzi in prova</h2>
              <ul className="vt-mezzi-prova">
                {mezzi.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <aside className="vt-box" id="iscriviti">
          {finito ? (
            <>
              <h2 className="vt-aside-tit">Evento concluso</h2>
              <p style={{ color: "var(--muted)" }}>Guarda i prossimi in calendario.</p>
              <Link href="/vetrina/eventi" className="vt-btn vt-btn-giallo">
                Prossimi eventi
              </Link>
            </>
          ) : (
            <>
              <h2 className="vt-aside-tit">{liberi === 0 ? "Lista d'attesa" : "Iscriviti all'evento"}</h2>
              <FormEvento evento={{ id: e.id, titolo: e.titolo, data: e.data, quando }} postiLiberi={liberi} mezzi={mezzi} versioneInformativa={s.versioneInformativa} telefono={v.telefono} />
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
