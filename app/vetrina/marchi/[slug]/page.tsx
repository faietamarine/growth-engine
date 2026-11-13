import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVetrinaSettings, mezziPubblici } from "@/features/vetrina/service";
import { getMarchio } from "@/lib/brands/catalog";
import { CONDIZIONI, type CategoriaId } from "@/lib/vetrina/catalog";
import { CardMezzo } from "@/components/vetrina/card-mezzo";
import { IconaCategoria } from "@/components/vetrina/icone";
import { LogoMarchio } from "@/components/brand/logo-marchio";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = getMarchio((await params).slug);
  return m ? { title: `Catalogo ${m.nome}`, description: `Tutti i modelli ${m.nome} di Faieta Marine, dealer ufficiale: a catalogo, pronte consegne e usato.` } : { title: "Marchio non trovato" };
}

/** Catalogo di un marchio: modelli a catalogo, pronte consegne e usato; con le macro aree se il marchio ne ha (es. barche e gommoni). */
export default async function CatalogoMarchio({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ area?: string }> }) {
  const marchio = getMarchio((await params).slug);
  if (!marchio) notFound();
  const sp = await searchParams;
  const [tutti, v] = await Promise.all([mezziPubblici({ marca: marchio.slug }), getVetrinaSettings()]);
  const area = marchio.aree?.find((a) => a.id === sp.area);
  const lista = area ? tutti.filter((m) => area.categorie.includes(m.categoria)) : tutti;
  const base = `/vetrina/marchi/${marchio.slug}`;
  const ordine = ["DA_ORDINARE", "PRONTA_CONSEGNA", "USATO"] as const;

  return (
    <main>
      <section className="vt-titolo-pag">
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › <Link href="/vetrina#marchi">Marchi</Link> › {marchio.nome}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "12px 22px", minHeight: 72, display: "flex", alignItems: "center" }}>
              <LogoMarchio m={marchio} style={{ height: 48, width: "auto", display: "block", fontSize: 20 }} />
            </div>
            <div>
              <h1>Catalogo {marchio.nome}</h1>
              <p>Dealer ufficiale · {tutti.length === 1 ? "1 mezzo disponibile" : `${tutti.length} mezzi disponibili`}</p>
            </div>
          </div>
        </div>
      </section>
      <div className="vt-wrap" style={{ paddingTop: 12 }}>
        {marchio.aree && (
          <nav className="vt-aree" aria-label={`Aree ${marchio.nome}`}>
            {marchio.aree.map((a) => {
              const foto = tutti.find((m) => a.categorie.includes(m.categoria) && m.foto[0])?.foto[0];
              return (
                <Link key={a.id} href={area?.id === a.id ? base : `${base}?area=${a.id}`} className="vt-area" aria-current={area?.id === a.id}>
                  {foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/media/${foto}`} alt="" loading="lazy" />
                  ) : (
                    <IconaCategoria id={a.categorie[0] as CategoriaId} />
                  )}
                  <span>{a.nome}</span>
                </Link>
              );
            })}
          </nav>
        )}
        {lista.length === 0 && (
          <div className="vt-vuoto" style={{ marginTop: 36 }}>
            <b>Il catalogo {area ? `${marchio.nome} · ${area.nome}` : marchio.nome} è in aggiornamento</b>
            Siamo dealer ufficiali {marchio.nome}: chiamaci al {v.telefono} per modelli, allestimenti e tempi di consegna.
            <div style={{ marginTop: 16 }}>
              <Link href="/vetrina#appuntamento" className="vt-btn vt-btn-giallo">
                Prenota la tua visita o il tuo appuntamento
              </Link>
            </div>
          </div>
        )}
        {ordine.map((id) => {
          const c = CONDIZIONI.find((x) => x.id === id)!;
          const l = lista.filter((m) => m.condizione === id);
          if (!l.length) return null;
          return (
            <section key={id} className="vt-sez">
              <div className="vt-sez-testa">
                <div>
                  <h2>{id === "DA_ORDINARE" ? "Modelli a catalogo" : c.titolo}</h2>
                  {id === "DA_ORDINARE" && <p className="vt-sub">Da ordinare: ti diciamo allestimenti, prezzi e tempi di consegna.</p>}
                </div>
              </div>
              <div className="vt-griglia">
                {l.map((m) => (
                  <CardMezzo key={m.id} m={m} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
