import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { postPerSlug, postPubblici } from "@/features/vetrina/contenuti";
import { dataLunga, estratto, minutiLettura } from "@/lib/vetrina/contenuti";
import { siteUrl } from "@/lib/seo/site";
import { TestoRicco } from "@/components/vetrina/testo-ricco";
import { CardPost } from "@/components/vetrina/card-contenuti";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await postPerSlug((await params).slug);
  if (!p) return { title: "Articolo non trovato" };
  const descrizione = p.sommario || estratto(p.testo);
  return {
    title: p.titolo,
    description: descrizione,
    alternates: { canonical: `/vetrina/blog/${p.slug}` },
    openGraph: { type: "article", title: p.titolo, description: descrizione, ...(p.foto ? { images: [`/media/${p.foto}`] } : {}) },
  };
}

export default async function Articolo({ params }: { params: Promise<{ slug: string }> }) {
  const p = await postPerSlug((await params).slug);
  if (!p) notFound();
  const altri = (await postPubblici(4)).filter((x) => x.id !== p.id).slice(0, 3);
  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.titolo,
    description: p.sommario || estratto(p.testo),
    datePublished: p.pubblicatoIl ?? undefined,
    dateModified: new Date(p.updatedAt).toISOString(),
    image: p.foto ? `${siteUrl()}/media/${p.foto}` : `${siteUrl()}/brand/faieta-marine.png`,
    author: { "@type": "Organization", name: "Faieta Marine" },
    publisher: { "@type": "Organization", name: "Faieta Marine", logo: { "@type": "ImageObject", url: `${siteUrl()}/brand/faieta-marine.png` } },
    mainEntityOfPage: `${siteUrl()}/vetrina/blog/${p.slug}`,
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <section className="vt-titolo-pag">
        <div className="vt-wrap vt-stretto">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › <Link href="/vetrina/blog">Blog</Link>
          </p>
          <h1>{p.titolo}</h1>
          <p>
            {p.pubblicatoIl ? dataLunga(p.pubblicatoIl) : ""} · {minutiLettura(p.testo)} min di lettura
          </p>
        </div>
      </section>
      <article className="vt-wrap vt-stretto vt-articolo">
        {p.foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${p.foto}`} alt="" className="vt-articolo-foto" />
        )}
        {p.sommario && <p className="vt-articolo-lead">{p.sommario}</p>}
        <TestoRicco testo={p.testo} />
        <div className="vt-banda" style={{ marginTop: 40 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>Hai una domanda su questo argomento?</h2>
            <p style={{ margin: "8px 0 0", color: "#DCE8FA" }}>Passa a trovarci o scrivici: ti rispondiamo noi, non un call center.</p>
          </div>
          <Link href="/vetrina#appuntamento" className="vt-btn vt-btn-giallo">
            Prenota un appuntamento
          </Link>
        </div>
      </article>
      {altri.length > 0 && (
        <section className="vt-wrap vt-sez">
          <div className="vt-sez-testa">
            <h2>Altri articoli</h2>
            <Link href="/vetrina/blog" className="vt-tutti">
              Tutto il blog →
            </Link>
          </div>
          <div className="vt-griglia">
            {altri.map((x) => (
              <CardPost key={x.id} p={x} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
