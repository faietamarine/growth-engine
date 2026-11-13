import { LogoMarchio } from "@/components/brand/logo-marchio";
import Link from "next/link";
import { Megaphone, Users, Send, ListChecks, Plus, ArrowRight, CalendarClock, CircleAlert } from "lucide-react";
import { getDashboard } from "@/features/dashboard/queries";
import { riepilogoMarchi } from "@/features/brands/service";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { CHANNEL_LABEL, REPARTO_UI, TASK_STATUS_UI, WORK_STATUS_UI, dataBreve, euro } from "@/lib/labels";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ accesso?: string }> }) {
  const user = await requireUser();
  const negato = (await searchParams).accesso === "negato";
  const { kpi, campagne, produzione, canali, ritardi, oggi } = await getDashboard();
  const marchi = await riepilogoMarchi();
  const maxCanale = Math.max(1, ...canali.map((c) => c.n));

  return (
    <>
      <PageHeader
        title="Dashboard produzione"
        subtitle={`Situazione al ${dataBreve(oggi)}: campagne, attività e lead pronti per Nautilus EVO`}
        action={
          can(user.role, "campagne:scrivi") ? (
            <Link href="/campagne/nuova" className="btn-primary">
              <Plus size={16} /> Nuova campagna
            </Link>
          ) : undefined
        }
      />

      {negato && (
        <p role="status" className="mb-4 rounded-md bg-warn/10 px-4 py-2.5 text-sm font-medium text-warn">
          La sezione che hai aperto non è disponibile per il tuo ruolo. Se ti serve, chiedi a un Admin.
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicatori">
        <Stat icon={Megaphone} label="Campagne attive" value={kpi.campagneAttive} hint={kpi.campagneInRevisione ? `${kpi.campagneInRevisione} in revisione` : "Nessuna in revisione"} />
        <Stat icon={Users} label="Lead del mese" value={kpi.leadMese} hint={`${kpi.leadQualMese} qualificati`} />
        <Stat icon={Send} label="Consegnati al CRM" value={kpi.consegnatiMese} hint="nel mese" />
        <Stat icon={ListChecks} label="Attività entro 7 giorni" value={produzione.length} hint={ritardi ? <span className="font-semibold text-danger">{ritardi} in ritardo</span> : "Nessun ritardo"} />
      </section>

      <section className="mt-6" aria-label="I marchi che rappresentiamo">
        <h2 className="mb-2 text-[15px] font-semibold">I marchi</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {marchi.map(({ marchio: m, campagneAttive, campagneTotali, leadMese }) => (
            <Link key={m.slug} href={`/marchi/${m.slug}`} className="card flex flex-col gap-3 p-4 transition hover:border-navy/40">
              <span className="flex h-16 items-center justify-center rounded-md bg-white p-2">
                <LogoMarchio m={m} className="max-h-full max-w-full object-contain" />
              </span>
              <span className="text-[13px] font-semibold">{m.nome}</span>
              <span className="text-[12.5px] text-ink-soft">
                <span className="num font-semibold text-ink">{campagneAttive}</span> {campagneAttive === 1 ? "campagna attiva" : "campagne attive"}
                {can(user.role, "lead:vedi") && (
                  <>
                    {" · "}
                    <span className="num font-semibold text-ink">{leadMese}</span> lead nel mese
                  </>
                )}
                {campagneAttive === 0 && campagneTotali === 0 && <span className="block text-ink-faint">Nessuna campagna ancora</span>}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {kpi.inCoda > 0 && can(user.role, "lead:consegna") && (
        <section className="card mt-4 flex flex-wrap items-center gap-3 border-gold/50 bg-gold/[.07] px-4 py-3">
          <Send size={18} className="text-gold" />
          <p className="flex-1 text-sm">
            <span className="font-semibold">
              {kpi.inCoda} {kpi.inCoda === 1 ? "lead qualificato" : "lead qualificati"}
            </span>{" "}
            {kpi.inCoda === 1 ? "aspetta di essere consegnato" : "aspettano di essere consegnati"} a Nautilus EVO.
          </p>
          <Link href="/lead" className="btn-gold btn-sm">
            Consegna al CRM <ArrowRight size={15} />
          </Link>
        </section>
      )}

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="card" aria-labelledby="t-camp">
          <div className="card-head">
            <h2 id="t-camp" className="card-title">
              Campagne
            </h2>
            <Link href="/campagne" className="text-[13px] font-semibold text-navy hover:underline">
              Tutte
            </Link>
          </div>
          {campagne.length === 0 ? (
            <EmptyState icon={Megaphone} title="Nessuna campagna" text="Parti da un obiettivo commerciale: il generatore propone piano, funnel e canali." />
          ) : (
            <ul className="divide-y divide-line">
              {campagne.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/campagne/${c.id}`} className="min-w-0 flex-1 truncate text-[14px] font-semibold hover:text-navy hover:underline" title={c.name}>
                      {c.name}
                    </Link>
                    <Badge tone={REPARTO_UI[c.reparto].tone}>{REPARTO_UI[c.reparto].label}</Badge>
                    <Badge tone={WORK_STATUS_UI[c.status].tone}>{WORK_STATUS_UI[c.status].label}</Badge>
                  </div>
                  <div className="mt-2">
                    <Progress value={c.leadQual} max={c.leadTarget} label={`Lead qualificati di ${c.name}`} />
                  </div>
                  <div className="num mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px] text-ink-soft">
                    <span>
                      <b className="text-ink">{c.leadQual}</b> / {c.leadTarget} lead qualificati
                    </span>
                    <span>
                      Speso {euro(c.spent)} di {euro(c.budget)}
                    </span>
                    {c.cpl !== null && <span>Costo per lead {euro(c.cpl)}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="min-w-0 space-y-4">
          <section className="card" aria-labelledby="t-prod">
            <div className="card-head">
              <h2 id="t-prod" className="card-title">
                Produzione dei prossimi 7 giorni
              </h2>
            </div>
            {produzione.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Niente in scadenza" text="Le attività con scadenza entro 7 giorni compaiono qui." />
            ) : (
              <ul className="divide-y divide-line">
                {produzione.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 px-4 py-2.5">
                    <div className={`num w-14 shrink-0 pt-0.5 text-[12px] font-semibold ${t.inRitardo ? "text-danger" : "text-ink-soft"}`}>
                      {t.inRitardo && <CircleAlert size={12} className="mr-0.5 inline -translate-y-px" aria-label="In ritardo" />}
                      {t.dueDate === oggi ? "Oggi" : dataBreve(t.dueDate)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium leading-snug">{t.title}</p>
                      <p className="truncate text-[12px] text-ink-faint">
                        {[t.assigneeName, t.campaignName].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Badge tone={TASK_STATUS_UI[t.status].tone}>{TASK_STATUS_UI[t.status].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="t-canali">
            <div className="card-head">
              <h2 id="t-canali" className="card-title">
                Lead per canale · ultimi 30 giorni
              </h2>
            </div>
            {canali.length === 0 ? (
              <EmptyState icon={Users} title="Ancora nessun lead" text="Appena una landing riceve richieste, qui vedi da dove arrivano." />
            ) : (
              <ul className="space-y-2.5 px-4 py-3">
                {canali.map(({ canale, n }) => (
                  <li key={canale} className="grid grid-cols-[92px_1fr_28px] items-center gap-3 text-[13px]">
                    <span className="text-ink-soft">{CHANNEL_LABEL[canale]}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-ink/[.06]">
                      <span className="block h-full rounded-full bg-navy" style={{ width: `${(n / maxCanale) * 100}%` }} />
                    </span>
                    <span className="num text-right font-semibold">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
