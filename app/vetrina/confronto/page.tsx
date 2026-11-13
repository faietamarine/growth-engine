import Link from "next/link";
import type { Metadata } from "next";
import { mezziPerId } from "@/features/vetrina/service";
import { getMarchio } from "@/lib/brands/catalog";
import { CONDIZIONI, euro, metri, nomeCategoria } from "@/lib/vetrina/catalog";
import { ScelteRedirect } from "@/components/vetrina/scelte-redirect";
import { SvuotaScelte } from "@/components/vetrina/svuota-scelte";
import { MAX_CONFRONTO } from "@/lib/vetrina/limiti";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confronta i mezzi", robots: { index: false, follow: true } };
const UUID = /^[0-9a-f-]{36}$/i;

export default async function Confronto({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids = "" } = await searchParams;
  const lista = [...new Set(ids.split(",").filter((x) => UUID.test(x)))].slice(0, MAX_CONFRONTO);
  const mappa = await mezziPerId(lista);
  const mezzi = lista.map((i) => mappa.get(i)).filter((m): m is NonNullable<typeof m> => !!m && m.stato !== "BOZZA");
  const nome = (m: (typeof mezzi)[number]) => `${getMarchio(m.marca)?.nome ?? m.marca} ${m.modello}`;
  // evidenzia il prezzo più basso quando si confrontano mezzi con un prezzo
  const prezzi = mezzi.map((m) => m.prezzo).filter((p): p is number => p != null);
  const minimo = prezzi.length > 1 ? Math.min(...prezzi) : null;

  const righe: { k: string; v: (m: (typeof mezzi)[number]) => React.ReactNode }[] = [
    { k: "Prezzo", v: (m) => <span className={m.prezzo != null && m.prezzo === minimo ? "best" : ""}>{m.prezzo == null ? "Su richiesta" : euro(m.prezzo)}</span> },
    { k: "Tipo", v: (m) => nomeCategoria(m.categoria) },
    { k: "Disponibilità", v: (m) => (m.stato === "VENDUTO" ? "Venduto" : (CONDIZIONI.find((c) => c.id === m.condizione)?.nome ?? "")) },
    { k: "Anno", v: (m) => m.anno ?? "—" },
    { k: "Lunghezza", v: (m) => (m.lunghezza ? metri(m.lunghezza) : "—") },
    { k: "Motore", v: (m) => m.motore || "—" },
    { k: "Ore motore", v: (m) => (m.ore != null ? m.ore : "—") },
    { k: "Persone", v: (m) => m.posti ?? "—" },
  ];
  return (
    <main>
      <ScelteRedirect chiave="vt-confronto" percorso="/vetrina/confronto" />
      <section className="vt-titolo-pag">
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › Confronto
          </p>
          <h1>Confronta i mezzi</h1>
          <p>Fino a tre mezzi affiancati, per scegliere con calma.</p>
        </div>
      </section>
      <div className="vt-wrap" style={{ paddingTop: 24 }}>
        {mezzi.length >= 2 ? (
          <>
            <div className="vt-confr">
              <table>
                <thead>
                  <tr>
                    <td />
                    {mezzi.map((m) => (
                      <th key={m.id} scope="col">
                        {m.foto[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/media/${m.foto[0]}`} alt={nome(m)} />
                        )}
                        <Link href={`/vetrina/mezzo/${m.id}`} style={{ display: "block", marginTop: 8, color: "var(--blu-scuro)" }}>
                          {nome(m)}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {righe.map((r) => (
                    <tr key={r.k}>
                      <th scope="row">{r.k}</th>
                      {mezzi.map((m) => (
                        <td key={m.id}>{r.v(m)}</td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" />
                    {mezzi.map((m) => (
                      <td key={m.id}>
                        <Link href={`/vetrina/mezzo/${m.id}#appuntamento`} className="vt-btn vt-btn-giallo">
                          Prenota visita
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: 20 }}>
              <SvuotaScelte chiave="vt-confronto" max={MAX_CONFRONTO} percorso="/vetrina/confronto" />
            </p>
          </>
        ) : (
          <div className="vt-vuoto">
            <b>Scegli almeno due mezzi</b>
            Su ogni mezzo tocca l&apos;icona di confronto, poi torna qui. <Link href="/vetrina/mezzi" style={{ color: "var(--blu)", fontWeight: 700 }}>Vedi tutti i mezzi</Link>.
          </div>
        )}
      </div>
    </main>
  );
}
