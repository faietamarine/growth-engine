import Link from "next/link";
import clsx from "clsx";
import { FileDown, Users, Target, Send, Euro, Lightbulb, TriangleAlert, Info, CircleAlert } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getReport } from "@/features/report/service";
import { PERIODI } from "@/lib/report/logic";
import { PageHeader } from "@/components/layout/page-header";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CHANNEL_LABEL, WORK_STATUS_UI, dataBreve, euro } from "@/lib/labels";

export const metadata = { title: "Report" };
export const dynamic = "force-dynamic";

const pct = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("it-IT")}%`);
const eur = (n: number | null) => (n === null ? "—" : euro(n));
const dataIt = (d: string) => d.split("-").reverse().join("/");

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  await requireUser("lead:vedi");
  const sp = await searchParams;
  const r = await getReport(sp.periodo);
  const { kpi, periodo: p } = r;
  const maxSerie = Math.max(1, ...r.andamento.map((x) => x.lead));
  const maxCanale = Math.max(1, ...r.canali.map((c) => c.lead));

  return (
    <>
      <PageHeader
        title="Report"
        subtitle="Cosa ha portato lead, quanto è costato e cosa migliorare"
        action={
          <a href={`/api/report/csv?periodo=${p.key}`} className="btn-ghost">
            <FileDown size={16} /> Esporta CSV
          </a>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <nav className="flex flex-wrap gap-1" aria-label="Periodo">
          {PERIODI.map((x) => (
            <Link key={x.key} href={`/report?periodo=${x.key}`} aria-current={p.key === x.key ? "page" : undefined} className={clsx("rounded-full px-3 py-1.5 text-[13px] font-semibold", p.key === x.key ? "bg-navy text-white" : "bg-surface text-ink-soft ring-1 ring-line hover:bg-hover")}>
              {x.nome}
            </Link>
          ))}
        </nav>
        <span className="num text-[12.5px] text-ink-faint">
          {p.etichetta} · {dataIt(p.da)} – {dataIt(p.a)}
        </span>
      </div>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Riepilogo">
        <Stat icon={Users} label="Lead arrivati" value={kpi.lead} />
        <Stat icon={Target} label="Qualificati" value={kpi.qualificati} hint={`${pct(kpi.tassoQualifica)} dei lead`} />
        <Stat icon={Send} label="Consegnati al CRM" value={kpi.consegnati} hint={kpi.inCoda ? <span className="font-semibold text-gold">{kpi.inCoda} in coda adesso</span> : "nessuno in coda"} />
        <Stat icon={Euro} label="Costo per qualificato" value={eur(kpi.cplQualificato)} hint={`spesa registrata ${euro(kpi.spesa)}`} />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-5">
          {/* Andamento */}
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Andamento lead</h2>
              <span className="flex items-center gap-3 text-[12px] text-ink-faint">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-navy/25" /> lead
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-gold" /> qualificati
                </span>
              </span>
            </div>
            <div className="overflow-x-auto p-4">
              <div className="flex h-40 min-w-[320px] items-end gap-1" role="img" aria-label={`Lead per ${p.key === "anno" || p.key === "nautico" ? "mese" : "settimana"}`}>
                {r.andamento.map((x) => (
                  <div key={x.etichetta} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${x.etichetta}: ${x.lead} lead, ${x.qualificati} qualificati`}>
                    <span className="num text-[10.5px] text-ink-faint">{x.lead || ""}</span>
                    <div className="relative w-full max-w-[36px] rounded-t bg-navy/25" style={{ height: `${(x.lead / maxSerie) * 100}%` }}>
                      <div className="absolute inset-x-0 bottom-0 rounded-t bg-gold" style={{ height: x.lead ? `${(x.qualificati / x.lead) * 100}%` : 0 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-1 flex min-w-[320px] gap-1">
                {r.andamento.map((x) => (
                  <span key={x.etichetta} className="min-w-0 flex-1 truncate text-center text-[10.5px] text-ink-faint">
                    {x.etichetta}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Canali */}
          <section className="card overflow-hidden">
            <div className="card-head">
              <h2 className="card-title">Per canale</h2>
            </div>
            {r.canali.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-soft">Nessun lead nel periodo.</p>
            ) : (
              <ul className="divide-y divide-line">
                {r.canali.map((c) => (
                  <li key={c.canale} className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-[13px]">
                    <span className="font-semibold">{CHANNEL_LABEL[c.canale]}</span>
                    <div className="relative h-2.5 rounded-full bg-ink/[.06]">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-navy/30" style={{ width: `${(c.lead / maxCanale) * 100}%` }} />
                      <div className="absolute inset-y-0 left-0 rounded-full bg-gold" style={{ width: `${(c.qualificati / maxCanale) * 100}%` }} />
                    </div>
                    <span className="num whitespace-nowrap text-[12.5px] text-ink-soft">
                      {c.lead} · <span className="font-semibold text-ink">{c.qualificati}</span> qual. ({pct(c.tasso)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Campagne */}
          <section className="card overflow-hidden">
            <div className="card-head">
              <h2 className="card-title">Campagne</h2>
              <span className="text-[12px] text-ink-faint">attive nel periodo</span>
            </div>
            {r.campagne.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-soft">Nessuna campagna attiva nel periodo.</p>
            ) : (
              <ul className="divide-y divide-line">
                {r.campagne.map((c) => {
                  const sopra = c.cpl !== null && c.cplObiettivo !== null && c.cpl > c.cplObiettivo * 1.3;
                  return (
                    <li key={c.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/campagne/${c.id}`} className="text-[13.5px] font-semibold hover:underline">
                          {c.nome}
                        </Link>
                        <Badge tone={WORK_STATUS_UI[c.stato].tone}>{WORK_STATUS_UI[c.stato].label}</Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] sm:grid-cols-4">
                        <span className="text-ink-soft">
                          Lead <b className="num text-ink">{c.lead}</b>
                        </span>
                        <span className="text-ink-soft">
                          Qualificati <b className="num text-ink">{c.qualificati}</b>
                        </span>
                        <span className="text-ink-soft">
                          Spesa <b className="num text-ink">{euro(c.spesa)}</b>
                        </span>
                        <span className={clsx(sopra ? "text-danger" : "text-ink-soft")}>
                          Per qualificato <b className="num">{eur(c.cpl)}</b>
                          {c.cplObiettivo !== null && <span className="text-ink-faint"> / obiettivo {euro(c.cplObiettivo)}</span>}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Progress value={c.spesa} max={c.budget} label={`Budget speso di ${c.nome}`} />
                        <p className="num mt-1 text-[11.5px] text-ink-faint">
                          budget speso {pct(c.avanzamentoBudget)} di {euro(c.budget)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Landing */}
          <section className="card overflow-hidden">
            <div className="card-head">
              <h2 className="card-title">Landing page</h2>
              <span className="text-[12px] text-ink-faint">visite e lead dalla pubblicazione</span>
            </div>
            {r.landing.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-soft">Nessuna landing pubblicata.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-[13px]">
                  <thead className="bg-ink/[.02] text-left text-[11.5px] uppercase text-ink-faint">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Pagina</th>
                      <th className="px-3 py-2 text-right font-semibold">Visite</th>
                      <th className="px-3 py-2 text-right font-semibold">Lead</th>
                      <th className="px-3 py-2 text-right font-semibold">Conv.</th>
                      <th className="px-4 py-2 text-right font-semibold">Nel periodo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {r.landing.map((l) => (
                      <tr key={l.id}>
                        <td className="max-w-[260px] truncate px-4 py-2">
                          <Link href={`/landing/${l.id}`} className="font-semibold hover:underline">
                            {l.titolo}
                          </Link>
                          {l.abAttivo && <Badge tone="aqua" className="ml-2">A/B</Badge>}
                        </td>
                        <td className="num px-3 py-2 text-right">{l.visite.toLocaleString("it-IT")}</td>
                        <td className="num px-3 py-2 text-right">{l.lead}</td>
                        <td className={clsx("num px-3 py-2 text-right font-semibold", l.conversione !== null && l.visite >= 300 && l.conversione < 2 && "text-danger")}>{pct(l.conversione)}</td>
                        <td className="num px-4 py-2 text-right">{l.leadPeriodo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          {/* Suggerimenti */}
          <section className="card">
            <div className="card-head">
              <h2 className="card-title inline-flex items-center gap-2">
                <Lightbulb size={16} className="text-gold" /> Cosa migliorare
              </h2>
            </div>
            <ul className="divide-y divide-line">
              {r.suggerimenti.map((s, i) => (
                <li key={i} className="flex gap-3 px-4 py-3">
                  {s.livello === "alta" ? <CircleAlert size={17} className="mt-0.5 shrink-0 text-danger" /> : s.livello === "media" ? <TriangleAlert size={17} className="mt-0.5 shrink-0 text-warn" /> : <Info size={17} className="mt-0.5 shrink-0 text-info" />}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{s.titolo}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-soft">{s.azione}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Eventi */}
          <section className="card overflow-hidden">
            <div className="card-head">
              <h2 className="card-title">Eventi del periodo</h2>
            </div>
            {r.eventi.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-soft">Nessun evento nel periodo.</p>
            ) : (
              <ul className="divide-y divide-line">
                {r.eventi.map((e) => (
                  <li key={e.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/eventi/${e.id}`} className="text-[13.5px] font-semibold hover:underline">
                        {e.nome}
                      </Link>
                      <span className="num text-[12px] text-ink-faint">{dataBreve(e.data)}</span>
                    </div>
                    <p className="num mt-1 text-[12.5px] text-ink-soft">
                      {e.iscritti} iscritti · {e.presenti} presenti · {e.sulPosto} sul posto · {e.qualificati} qualificati · {eur(e.cpl)} per lead
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Produzione */}
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Produzione</h2>
              <Link href="/calendario?vista=elenco&stato=aperte" className="text-[12.5px] font-semibold text-navy hover:underline">
                Calendario
              </Link>
            </div>
            <div className="space-y-2 p-4 text-[13px]">
              <p>
                Attività scadute nel periodo completate: <b className="num">{r.produzione.fatte}</b> su <b className="num">{r.produzione.scadute}</b> ({pct(r.produzione.puntualita)})
              </p>
              <Progress value={r.produzione.fatte} max={r.produzione.scadute} label="Attività completate" />
              <p className={clsx(r.produzione.inRitardo ? "text-danger" : "text-ink-soft")}>
                In ritardo oggi: <b className="num">{r.produzione.inRitardo}</b>
                {r.produzione.inRitardo > 0 && ` (in media da ${r.produzione.ritardoMedioGiorni} ${r.produzione.ritardoMedioGiorni === 1 ? "giorno" : "giorni"})`}
              </p>
            </div>
          </section>

          <p className="px-1 text-[12px] text-ink-faint">
            Come si leggono i numeri: un lead conta nel periodo in cui è arrivato; «qualificati» = in coda + già consegnati al CRM. La spesa è quella inserita a mano nelle campagne attive nel periodo (più gli eventi senza campagna), quindi il costo per qualificato è indicativo. Anno nautico: 1° settembre – 31 agosto.
          </p>
        </div>
      </div>
    </>
  );
}
