import Link from "next/link";
import clsx from "clsx";
import { Inbox, FileDown, Info, Check, X } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { listLeads, listDeliveries, getMinScore, type LeadView } from "@/features/leads/service";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CHANNEL_LABEL, LEAD_STATUS_UI, REPARTO_UI, dataBreve } from "@/lib/labels";
import { scoreBand } from "@/lib/leads/score";
import { ExportButton } from "./export-button";
import { cambiaStatoLead } from "./actions";

export const metadata = { title: "Lead verso CRM" };
export const dynamic = "force-dynamic";

const VISTE: { key: LeadView; label: string }[] = [
  { key: "coda", label: "Da consegnare" },
  { key: "consegnati", label: "Consegnati" },
  { key: "non-qualificati", label: "Non qualificati" },
  { key: "tutti", label: "Tutti" },
];

const BAND_TONE = { caldo: "ok", tiepido: "gold", freddo: "neutral" } as const;

export default async function LeadPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const user = await requireUser("lead:vedi");
  const sp = await searchParams;
  const vista = (VISTE.find((v) => v.key === sp.vista)?.key ?? "coda") as LeadView;
  const [{ rows, counts }, lotti, minScore] = await Promise.all([listLeads(vista), listDeliveries(), getMinScore()]);
  const puoConsegnare = can(user.role, "lead:consegna");

  return (
    <>
      <PageHeader
        title="Lead verso CRM"
        subtitle={`I lead con punteggio da ${minScore}/100 in su sono qualificati e pronti per Nautilus EVO`}
        action={puoConsegnare ? <ExportButton count={counts.coda} /> : undefined}
      />

      <div className="card mb-4 flex gap-3 px-4 py-3 text-[13px] text-ink-soft">
        <Info size={17} className="mt-0.5 shrink-0 text-info" />
        <p>
          Nautilus EVO non ha ancora un server che riceva i lead in automatico. La consegna avviene con un file: i lead <b className="text-ink">Vendita</b> e{" "}
          <b className="text-ink">Noleggio</b> vanno nei Lead (stato &quot;Qualificato&quot;, assegnati a Marco), i lead <b className="text-ink">Service</b> nei Lead Service (assegnati a Daniele).
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <nav className="flex flex-wrap gap-1" aria-label="Viste">
          {VISTE.map((v) => (
            <Link
              key={v.key}
              href={`/lead?vista=${v.key}`}
              aria-current={vista === v.key ? "page" : undefined}
              className={clsx("rounded-full px-3 py-1.5 text-[13px] font-semibold", vista === v.key ? "bg-navy text-white" : "bg-surface text-ink-soft ring-1 ring-line hover:bg-hover")}
            >
              {v.label} <span className="num opacity-70">{counts[v.key]}</span>
            </Link>
          ))}
        </nav>
        <a href={`/api/export/csv?vista=${vista}`} className="btn-ghost btn-sm ml-auto">
          <FileDown size={15} /> CSV
        </a>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={vista === "coda" ? "Nessun lead da consegnare" : "Nessun lead in questa vista"}
            text={vista === "coda" ? "Quando una landing o un evento raccoglie un lead qualificato, compare qui." : undefined}
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((l) => {
              const band = scoreBand(l.score);
              const modificabile = puoConsegnare && (l.status === "NON_QUALIFICATO" || l.status === "QUALIFICATO" || l.status === "SCARTATO");
              return (
                <li key={l.id} className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold">
                        {l.firstName} {l.lastName}
                      </span>
                      <Badge tone={REPARTO_UI[l.reparto].tone}>{REPARTO_UI[l.reparto].label}</Badge>
                      <Badge tone={BAND_TONE[band]}>
                        <span className="num">
                          {l.score}/100 · {band}
                        </span>
                      </Badge>
                      {vista !== "coda" && <Badge tone={LEAD_STATUS_UI[l.status].tone}>{LEAD_STATUS_UI[l.status].label}</Badge>}
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-ink">{l.interest || "Interesse non indicato"}</p>
                    <p className="num truncate text-[12px] text-ink-faint">
                      {[dataBreve(l.createdAt), CHANNEL_LABEL[l.channel], l.campaignName, l.timeframe, l.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {modificabile && (
                    <div className="flex items-center gap-2 md:justify-end">
                      {l.status !== "QUALIFICATO" && (
                        <form action={cambiaStatoLead}>
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="stato" value="QUALIFICATO" />
                          <button className="btn-ghost btn-sm" title="Mettilo in coda per il CRM anche se il punteggio è basso">
                            <Check size={14} /> Qualifica
                          </button>
                        </form>
                      )}
                      {l.status !== "SCARTATO" && (
                        <form action={cambiaStatoLead}>
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="stato" value="SCARTATO" />
                          <button className="btn-ghost btn-sm text-danger" title="Spam, doppione o richiesta non pertinente">
                            <X size={14} /> Scarta
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {puoConsegnare && lotti.length > 0 && (
        <section className="card mt-4" aria-labelledby="t-lotti">
          <div className="card-head">
            <h2 id="t-lotti" className="card-title">
              Ultime consegne
            </h2>
          </div>
          <ul className="divide-y divide-line">
            {lotti.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className="num font-mono text-[12px]">{d.batch}</span>
                <span className="text-ink-soft">
                  {dataBreve(d.createdAt)} · {d.leadCount} lead
                </span>
                <a href={`/api/export/nautilus/${d.batch}`} className="ml-auto text-[13px] font-semibold text-navy hover:underline">
                  Scarica di nuovo
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
