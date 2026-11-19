import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVetrinaSettings, mezzoPubblico, mezziPubblici, registraVisita } from "@/features/vetrina/service";
import { getSiteSettings } from "@/features/settings/service";
import { siteUrl } from "@/lib/seo/site";
import { getMarchio } from "@/lib/brands/catalog";
import { CONDIZIONI, datiVitali, euro, nomeCategoria } from "@/lib/vetrina/catalog";
import { Galleria } from "@/components/vetrina/galleria";
import { PrezzoMezzo } from "@/components/vetrina/prezzo-mezzo";
import { SceltaAzione } from "@/components/vetrina/scelta-azione";
import { FinanziamentoMezzo } from "@/components/vetrina/finanziamento-mezzo";
import { BarraPrenota } from "@/components/vetrina/barra-prenota";
import { finanziamentoMostrabile } from "@/lib/vetrina/finanziamento";
import { oggiRoma } from "@/lib/vetrina/promo";
import { Repeat } from "lucide-react";
import { BollinoGoogle } from "@/components/vetrina/bollino-google";
import { AzioniMezzo } from "@/components/vetrina/azioni-mezzo";
import { FormBrochure } from "@/components/vetrina/form-brochure";
import { FormAvviso } from "@/components/vetrina/form-avviso";
import { CardMezzo } from "@/components/vetrina/card-mezzo";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const m = UUID.test(id) ? await mezzoPubblico(id) : undefined;
  if (!m) return { title: "Mezzo non trovato" };
  const titolo = `${getMarchio(m.marca)?.nome ?? m.marca} ${m.modello}`;
  const cond = CONDIZIONI.find((c) => c.id === m.condizione);
  const descrizione = `${titolo}${m.anno ? ` ${m.anno}` : ""} · ${euro(m.prezzo)}. ${m.descrizione.slice(0, 120) || `${cond?.nome ?? ""} da Faieta Marine a Pescara: prenota la tua visita.`}`.trim();
  const img = m.foto[0] ? `/media/${m.foto[0]}` : "/brand/faieta-marine.png";
  return {
    title: `${titolo} a Pescara`,
    description: descrizione,
    alternates: { canonical: `/vetrina/mezzo/${id}` },
    openGraph: { title: titolo, description: descrizione, images: [img], type: "website" },
    twitter: { card: "summary_large_image", title: titolo, description: descrizione, images: [img] },
  };
}

export default async function SchedaMezzo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const m = await mezzoPubblico(id);
  if (!m) notFound();
  await registraVisita(m.id);
  const [v, s, correlati] = await Promise.all([getVetrinaSettings(), getSiteSettings(), mezziPubblici({ marca: m.marca })]);
  const marca = getMarchio(m.marca);
  const nome = `${marca?.nome ?? m.marca} ${m.modello}`;
  const cond = CONDIZIONI.find((c) => c.id === m.condizione);
  const vitali = datiVitali(m);
  const altri = correlati.filter((x) => x.id !== m.id && x.stato === "PUBBLICATO").slice(0, 3);
  const venduto = m.stato === "VENDUTO";
  const aCatalogo = m.condizione === "DA_ORDINARE";
  const incluso = m.incluso.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8);
  const rif = { id: m.id, etichetta: nome, prezzo: m.prezzo, condizione: cond?.nome ?? "" };
  const mostraFin = !venduto && m.finanziabile && finanziamentoMostrabile(v.finanziamento, m.prezzo, oggiRoma());

  const base = siteUrl();
  const prodotto = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: nome,
    brand: { "@type": "Brand", name: marca?.nome ?? m.marca },
    category: nomeCategoria(m.categoria),
    description: m.descrizione || undefined,
    image: m.foto.map((f) => `${base}/media/${f}`),
    url: `${base}/vetrina/mezzo/${m.id}`,
    itemCondition: m.condizione === "USATO" ? "https://schema.org/UsedCondition" : "https://schema.org/NewCondition",
    offers:
      m.prezzo != null && !venduto
        ? { "@type": "Offer", price: m.prezzo, priceCurrency: "EUR", availability: m.condizione === "DA_ORDINARE" ? "https://schema.org/PreOrder" : "https://schema.org/InStock", url: `${base}/vetrina/mezzo/${m.id}` }
        : undefined,
  };
  return (
    <main className="vt-wrap" style={{ paddingTop: 20 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(prodotto).replace(/</g, "\\u003c") }} />
      <p className="vt-briciole" style={{ color: "var(--muted)" }}>
        <Link href="/vetrina">Home</Link> › {m.condizione === "DA_ORDINARE" ? <Link href={`/vetrina/marchi/${m.marca}`}>Catalogo {marca?.nome}</Link> : <Link href={`/vetrina/mezzi?condizione=${cond?.slug ?? ""}`}>{cond?.titolo}</Link>} › {nome}
      </p>
      <div className="vt-scheda2">
        <div className="vt-s-gal">
          <Galleria foto={m.foto} alt={nome} />
        </div>
        <aside className="vt-s-side">
          <div className="vt-box">
            <span className="vt-card-marca">
              {marca?.nome} · {nomeCategoria(m.categoria)} · {aCatalogo ? "Da ordinare" : (cond?.nome ?? "")}
            </span>
            <h1>{m.modello}</h1>
            {!venduto && <AzioniMezzo id={m.id} esteso />}
            <PrezzoMezzo m={m} grande />
            {incluso.length > 0 && !venduto && (
              <ul className="vt-incluso" aria-label="Il prezzo comprende">
                {incluso.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
            <div style={{ margin: "12px 0 4px" }}>
              <BollinoGoogle v={v} />
            </div>
            {vitali.length > 0 && (
              <dl className="vt-vitali">
                {vitali.map((d) => (
                  <div key={d.k}>
                    <dt>{d.k}</dt>
                    <dd>{d.v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {venduto ? (
              <>
                <p style={{ color: "var(--muted)" }}>Questo mezzo è stato venduto. Lasciaci un contatto: ti avvisiamo se ne arriva uno simile.</p>
                <FormAvviso cosa={nome} mezzoId={m.id} versioneInformativa={s.versioneInformativa} />
              </>
            ) : (
              <SceltaAzione mezzo={rif} aCatalogo={aCatalogo} whatsapp={v.whatsapp} telefono={v.telefono} versioneInformativa={s.versioneInformativa} finanziamento={mostraFin} />
            )}
          </div>
          {!venduto && (
            <Link href={`/vetrina/valuta?per=${m.id}`} className="vt-box vt-permuta">
              <Repeat size={26} aria-hidden />
              <span>
                <b>Hai un mezzo da cambiare?</b>
                Lo valutiamo in permuta: mandaci i dati e qualche foto.
              </span>
              <span aria-hidden>→</span>
            </Link>
          )}
          {m.brochure && !venduto && (
            <div className="vt-box" style={{ marginTop: 16 }}>
              <FormBrochure mezzoId={m.id} etichetta={nome} versioneInformativa={s.versioneInformativa} />
            </div>
          )}
        </aside>
        <div className="vt-s-info">
          {mostraFin && <FinanziamentoMezzo finanziaria={v.finanziamento.finanziaria} contatti={v.finanziamento.contatti} fine={v.finanziamento.validoFino || null} />}
          {m.descrizione && (
            <div className="vt-box">
              <h2 style={{ fontSize: 20, marginBottom: 10, color: "var(--blu-scuro)" }}>Descrizione</h2>
              <p className="vt-testo" style={{ margin: 0 }}>
                {m.descrizione}
              </p>
            </div>
          )}
          {m.dotazioni.length > 0 && (
            <div className="vt-box">
              <h2 style={{ fontSize: 20, marginBottom: 12, color: "var(--blu-scuro)" }}>Dotazioni</h2>
              <ul className="vt-dot">
                {m.dotazioni.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      {!venduto && <BarraPrenota href="#offerta" etichetta={aCatalogo ? "Richiedi il preventivo" : "Ricevi l'offerta su WhatsApp"} obiettivo="offerta" soglia={700} verde={!aCatalogo} />}
      {altri.length > 0 && (
        <section className="vt-sez">
          <div className="vt-sez-testa">
            <h2>Altri {marca?.nome}</h2>
            <Link href={`/vetrina/marchi/${m.marca}`} className="vt-tutti">
              Tutto il catalogo →
            </Link>
          </div>
          <div className="vt-griglia">
            {altri.map((x) => (
              <CardMezzo key={x.id} m={x} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
