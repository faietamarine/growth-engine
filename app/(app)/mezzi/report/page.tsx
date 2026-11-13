import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { reportMezzi } from "@/features/vetrina/service";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Visite e richieste" };
export const dynamic = "force-dynamic";

export default async function ReportMezzi({ searchParams }: { searchParams: Promise<{ giorni?: string }> }) {
  await requireUser("contenuti:scrivi");
  const g = [7, 30, 90].includes(Number((await searchParams).giorni)) ? Number((await searchParams).giorni) : 30;
  const righe = await reportMezzi(g);
  const tot = righe.reduce((a, r) => ({ v: a.v + r.visite, r: a.r + r.richieste, b: a.b + r.brochure, a: a.a + r.avvisi }), { v: 0, r: 0, b: 0, a: 0 });
  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <PageHeader title="Visite e richieste" subtitle={`Quali mezzi interessano di più, negli ultimi ${g} giorni`} />
      <div className="mb-3 flex flex-wrap gap-2">
        {[7, 30, 90].map((x) => (
          <Link key={x} href={`/mezzi/report?giorni=${x}`} className={x === g ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
            {x} giorni
          </Link>
        ))}
      </div>
      <p className="mb-3 text-[12px] text-ink-faint">Le visite sono approssimate (contano anche alcuni robot dei motori di ricerca) e partono dal giorno dell&apos;aggiornamento. Le richieste sono i contatti reali arrivati dal sito.</p>
      {righe.length === 0 ? (
        <div className="card"><EmptyState icon={BarChart3} title="Ancora nessun dato" text="Appena il sito riceve visite e richieste, compaiono qui." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-ink-faint">
                <th className="px-4 py-2 font-medium">Mezzo</th>
                <th className="px-3 py-2 text-right font-medium">Visite</th>
                <th className="px-3 py-2 text-right font-medium">Richieste di visita</th>
                <th className="px-3 py-2 text-right font-medium">Brochure</th>
                <th className="px-3 py-2 text-right font-medium">Avvisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {righe.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2"><Link href={`/mezzi/${r.id}`} className="font-medium hover:underline">{r.nome}</Link>{r.stato === "VENDUTO" && <span className="ml-2 text-ink-faint">venduto</span>}</td>
                  <td className="num px-3 py-2 text-right">{r.visite}</td>
                  <td className="num px-3 py-2 text-right font-semibold">{r.richieste}</td>
                  <td className="num px-3 py-2 text-right">{r.brochure}</td>
                  <td className="num px-3 py-2 text-right">{r.avvisi}</td>
                </tr>
              ))}
              <tr className="bg-surface font-semibold">
                <td className="px-4 py-2">Totale</td>
                <td className="num px-3 py-2 text-right">{tot.v}</td>
                <td className="num px-3 py-2 text-right">{tot.r}</td>
                <td className="num px-3 py-2 text-right">{tot.b}</td>
                <td className="num px-3 py-2 text-right">{tot.a}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
