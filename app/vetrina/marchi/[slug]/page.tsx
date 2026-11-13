import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVetrinaSettings, mezziPubblici } from "@/features/vetrina/service";
import { getMarchio } from "@/lib/brands/catalog";
import { CONDIZIONI } from "@/lib/vetrina/catalog";
import { CardMezzo } from "@/components/vetrina/card-mezzo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = getMarchio((await params).slug);
  return m ? { title: `Catalogo ${m.nome}`, description: `Tutti i modelli ${m.nome} di Faieta Marine: pronte consegne, da ordinare e usato.` } : { title: "Marchio non trovato" };
}

/** Catalogo di un marchio: tutti i suoi mezzi, divisi per pronta consegna, da ordinare e usato. */
export default async function CatalogoMarchio({ params }: { params: Promise<{ slug: string }> }) {
  const marchio = getMarchio((await params).slug);
  if (!marchio) notFound();
  const [lista, v] = await Promise.all([mezziPubblici({ marca: marchio.slug }), getVetrinaSettings()]);
  return (
    <main>
      <section className="vt-titolo-pag">
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › <Link href="/vetrina#marchi">Marchi</Link> › {marchio.nome}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "12px 20px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={marchio.logo} alt={marchio.nome} style={{ height: 48, width: "auto", display: "block" }} />
            </div>
            <div>
              <h1>Catalogo {marchio.nome}</h1>
              <p>{marchio.nota ? `${marchio.nota} · ` : ""}{lista.length === 1 ? "1 mezzo disponibile" : `${lista.length} mezzi disponibili`}</p>
            </div>
          </div>
        </div>
      </section>
      <div className="vt-wrap" style={{ paddingTop: 12 }}>
        {lista.length === 0 && (
          <div className="vt-vuoto" style={{ marginTop: 36 }}>
            <b>Il catalogo {marchio.nome} è in aggiornamento</b>
            Siamo rivenditori {marchio.nome}: chiamaci al {v.telefono} per modelli, allestimenti e tempi di consegna.
            <div style={{ marginTop: 16 }}>
              <Link href="/vetrina#appuntamento" className="vt-btn vt-btn-giallo">
                Prenota la tua visita o il tuo appuntamento
              </Link>
            </div>
          </div>
        )}
        {CONDIZIONI.map((c) => {
          const l = lista.filter((m) => m.condizione === c.id);
          if (!l.length) return null;
          return (
            <section key={c.id} className="vt-sez">
              <div className="vt-sez-testa">
                <h2>{c.titolo}</h2>
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
