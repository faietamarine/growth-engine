import Link from "next/link";
import type { Metadata } from "next";
import { mezziPerId } from "@/features/vetrina/service";
import { CardMezzo } from "@/components/vetrina/card-mezzo";
import { ScelteRedirect } from "@/components/vetrina/scelte-redirect";
import { SvuotaScelte } from "@/components/vetrina/svuota-scelte";
import { MAX_PREFERITI } from "@/lib/vetrina/limiti";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "I tuoi preferiti", robots: { index: false, follow: true } };
const UUID = /^[0-9a-f-]{36}$/i;

export default async function Preferiti({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids = "" } = await searchParams;
  const lista = [...new Set(ids.split(",").filter((x) => UUID.test(x)))].slice(0, MAX_PREFERITI);
  const mappa = await mezziPerId(lista);
  const mezzi = lista.map((i) => mappa.get(i)).filter((m) => m && m.stato !== "BOZZA");
  return (
    <main>
      <ScelteRedirect chiave="vt-preferiti" percorso="/vetrina/preferiti" />
      <section className="vt-titolo-pag">
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › Preferiti
          </p>
          <h1>I tuoi preferiti</h1>
          <p>I mezzi che hai salvato restano su questo telefono.</p>
        </div>
      </section>
      <div className="vt-wrap" style={{ paddingTop: 24 }}>
        {mezzi.length ? (
          <>
            <div className="vt-griglia">{mezzi.map((m) => m && <CardMezzo key={m.id} m={m} />)}</div>
            <p style={{ marginTop: 20 }}>
              <SvuotaScelte chiave="vt-preferiti" max={MAX_PREFERITI} percorso="/vetrina/preferiti" />
            </p>
          </>
        ) : (
          <div className="vt-vuoto">
            <b>Ancora nessun preferito</b>
            Tocca il cuore su un mezzo per ritrovarlo qui. <Link href="/vetrina/mezzi" style={{ color: "var(--blu)", fontWeight: 700 }}>Vedi tutti i mezzi</Link>.
          </div>
        )}
      </div>
    </main>
  );
}
