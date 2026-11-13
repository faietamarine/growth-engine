import Link from "next/link";
import type { Metadata } from "next";
import { mezziPubblici } from "@/features/vetrina/service";
import { MARCHI } from "@/lib/brands/catalog";
import { CATEGORIE, CATEGORIA_IDS, CONDIZIONI, condizioneDaSlug, nomeCategoria } from "@/lib/vetrina/catalog";
import { CardMezzo } from "@/components/vetrina/card-mezzo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tutti i mezzi" };

type SP = { condizione?: string; categoria?: string; marca?: string };

export default async function ElencoMezzi({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const cond = condizioneDaSlug(sp.condizione);
  const categoria = (CATEGORIA_IDS as string[]).includes(sp.categoria ?? "") ? sp.categoria : undefined;
  const marca = MARCHI.find((m) => m.slug === sp.marca);
  const lista = await mezziPubblici({ condizione: cond?.id, categoria, marca: marca?.slug });

  const href = (p: SP) => {
    const q = new URLSearchParams(Object.entries({ condizione: cond?.slug, categoria, marca: marca?.slug, ...p }).filter(([, v]) => v) as [string, string][]);
    const s = q.toString();
    return `/vetrina/mezzi${s ? `?${s}` : ""}`;
  };
  const titolo = cond?.titolo ?? (marca ? `Modelli ${marca.nome}` : categoria ? nomeCategoria(categoria) : "Tutti i mezzi");

  return (
    <main>
      <section className="vt-titolo-pag">
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › {titolo}
          </p>
          <h1>{titolo}</h1>
          <p>{cond?.sotto ?? "Tutti gli annunci disponibili da Faieta Marine."}</p>
        </div>
      </section>
      <div className="vt-wrap">
        <div className="vt-filtri">
          <div className="vt-filtri-gruppo">
            <em>Dove</em>
            <Link href={href({ condizione: undefined })} className="vt-chip" aria-current={!cond}>
              Tutto
            </Link>
            {CONDIZIONI.map((c) => (
              <Link key={c.id} href={href({ condizione: c.slug })} className="vt-chip" aria-current={cond?.id === c.id}>
                {c.nome}
              </Link>
            ))}
          </div>
          <div className="vt-filtri-gruppo">
            <em>Tipo</em>
            <Link href={href({ categoria: undefined })} className="vt-chip" aria-current={!categoria}>
              Tutti
            </Link>
            {CATEGORIE.map((c) => (
              <Link key={c.id} href={href({ categoria: c.id })} className="vt-chip" aria-current={categoria === c.id}>
                {c.nome}
              </Link>
            ))}
          </div>
          <div className="vt-filtri-gruppo">
            <em>Marchio</em>
            <Link href={href({ marca: undefined })} className="vt-chip" aria-current={!marca}>
              Tutti
            </Link>
            {MARCHI.map((m) => (
              <Link key={m.slug} href={href({ marca: m.slug })} className="vt-chip" aria-current={marca?.slug === m.slug}>
                {m.nome}
              </Link>
            ))}
          </div>
        </div>
        <p className="vt-conta">{lista.length === 1 ? "1 mezzo" : `${lista.length} mezzi`}</p>
        {lista.length ? (
          <div className="vt-griglia">
            {lista.map((m) => (
              <CardMezzo key={m.id} m={m} />
            ))}
          </div>
        ) : (
          <div className="vt-vuoto">
            <b>Nessun mezzo con questi filtri</b>
            Prova a togliere un filtro, oppure <Link href="/vetrina#appuntamento" style={{ color: "var(--blu)", fontWeight: 700 }}>scrivici cosa cerchi</Link>: ti avvisiamo appena arriva.
          </div>
        )}
      </div>
    </main>
  );
}
