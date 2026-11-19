import Link from "next/link";
import type { Metadata } from "next";
import { postPubblici } from "@/features/vetrina/contenuti";
import { CardPost } from "@/components/vetrina/card-contenuti";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Blog: consigli e novità dal mare",
  description: "Guide pratiche su barche, gommoni, motori, rimessaggio e patente nautica, dallo staff di Faieta Marine a Pescara.",
  alternates: { canonical: "/vetrina/blog" },
};

export default async function Blog() {
  const lista = await postPubblici();
  return (
    <main>
      <section className="vt-titolo-pag">
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › Blog
          </p>
          <h1>Consigli e novità dal mare</h1>
          <p>Guide pratiche scritte da chi vende e ripara mezzi nautici ogni giorno, a Pescara.</p>
        </div>
      </section>
      <div className="vt-wrap" style={{ paddingTop: 28 }}>
        {lista.length ? (
          <div className="vt-griglia">
            {lista.map((p) => (
              <CardPost key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="vt-vuoto">
            <b>Primi articoli in arrivo</b>
            Stiamo scrivendo le prime guide. Torna a trovarci presto.
          </div>
        )}
      </div>
    </main>
  );
}
