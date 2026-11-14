import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVetrinaSettings, mezziPubblici } from "@/features/vetrina/service";
import { getSiteSettings } from "@/features/settings/service";
import { CardMezzo } from "@/components/vetrina/card-mezzo";
import { FormAppuntamento } from "@/components/vetrina/form-appuntamento";
import { LogoMarchio } from "@/components/brand/logo-marchio";
import { getMarchio } from "@/lib/brands/catalog";
import { paginaLocale, pagineLocali } from "@/lib/seo/locali";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = paginaLocale((await params).slug);
  if (!p) return {};
  return {
    title: p.titolo,
    description: `${p.titolo}: modelli, prezzi e disponibilità da Faieta Marine, concessionario ufficiale ${p.marcaNome}. Prenota la tua visita o il tuo appuntamento.`,
    alternates: { canonical: `/vetrina/p/${p.slug}` },
  };
}

export default async function Locale({ params }: P) {
  const p = paginaLocale((await params).slug);
  if (!p) notFound();
  const marchio = getMarchio(p.marca)!;
  const [s, v, tutti] = await Promise.all([getSiteSettings(), getVetrinaSettings(), mezziPubblici({ marca: p.marca, categoria: p.categoria })]);
  const altre = pagineLocali().filter((x) => x.marca === p.marca && x.slug !== p.slug);
  const faq = [
    { d: `Dove posso vedere un ${p.singolare} ${p.marcaNome} a Pescara?`, r: `Da Faieta Marine, concessionario ufficiale ${p.marcaNome}, in ${v.indirizzo}. Puoi prenotare una visita o un appuntamento dal sito o chiamarci al ${v.telefono}.` },
    { d: "Posso dare la mia barca in permuta?", r: "Sì: descrivi il tuo mezzo nella pagina Valuta la tua barca e ti facciamo una valutazione senza impegno." },
    { d: "Seguite il mezzo dopo l'acquisto?", r: "Sì, in sede abbiamo officina e assistenza. Puoi chiedere un preventivo dalla pagina Assistenza." },
  ];
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.d, acceptedAnswer: { "@type": "Answer", text: x.r } })) };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <section className="vt-titolo-pag">
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › <Link href={`/vetrina/marchi/${p.marca}`}>{p.marcaNome}</Link> › {p.titolo}
          </p>
          <h1>{p.titolo}</h1>
          <p>Concessionario ufficiale {p.marcaNome}: modelli a catalogo e disponibilità in sede.</p>
        </div>
      </section>
      <div className="vt-wrap" style={{ paddingTop: 24 }}>
        <div style={{ maxWidth: 220, marginBottom: 16 }}>
          <LogoMarchio m={marchio} style={{ maxHeight: 60, width: "auto" }} />
        </div>
        {tutti.length ? (
          <div className="vt-griglia">{tutti.map((m) => <CardMezzo key={m.id} m={m} />)}</div>
        ) : (
          <div className="vt-vuoto">
            <b>Nessun modello online in questo momento</b>
            Chiedici disponibilità e tempi: ti rispondiamo noi.
          </div>
        )}
        <section style={{ marginTop: 32 }}>
          <h2>Perché {p.singolare} {p.marcaNome} da Faieta Marine</h2>
          <p style={{ maxWidth: 680 }}>
            Siamo a Pescara e seguiamo il cliente dalla scelta alla consegna: visita a bordo, prova in mare, valutazione del tuo usato in permuta e assistenza in officina dopo l&apos;acquisto.
          </p>
          <p>
            Cerchi altro di {p.marcaNome}?{" "}
            {altre.map((x, i) => (
              <span key={x.slug}>
                {i > 0 && " · "}
                <Link href={`/vetrina/p/${x.slug}`} style={{ color: "var(--blu)", fontWeight: 700 }}>{x.titolo}</Link>
              </span>
            ))}
            {altre.length > 0 && " · "}
            <Link href={`/vetrina/marchi/${p.marca}`} style={{ color: "var(--blu)", fontWeight: 700 }}>tutta la gamma {p.marcaNome}</Link>
          </p>
        </section>
        <section style={{ marginTop: 24 }}>
          <h2>Domande frequenti</h2>
          {faq.map((x) => (
            <details key={x.d} style={{ margin: "8px 0" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>{x.d}</summary>
              <p>{x.r}</p>
            </details>
          ))}
        </section>
        <div className="vt-box" style={{ maxWidth: 640, margin: "28px auto 0" }}>
          <h2 style={{ marginTop: 0 }}>Prenota la tua visita o il tuo appuntamento</h2>
          <FormAppuntamento versioneInformativa={s.versioneInformativa} telefono={v.telefono} />
        </div>
      </div>
    </main>
  );
}
