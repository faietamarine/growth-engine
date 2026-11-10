import Link from "next/link";
import clsx from "clsx";
import { Plus, Megaphone, Search } from "lucide-react";
import { WORK_STATUS, type WorkStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { listCampaigns } from "@/features/campaigns/service";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/ui/flash";
import { REPARTO_UI, WORK_STATUS_UI, dataBreve, euro } from "@/lib/labels";

export const metadata = { title: "Campagne" };
export const dynamic = "force-dynamic";

export default async function CampagnePage({ searchParams }: { searchParams: Promise<{ stato?: string; q?: string; msg?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const stato = WORK_STATUS.includes(sp.stato as WorkStatus) ? (sp.stato as WorkStatus) : undefined;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const { rows, conteggi } = await listCampaigns({ stato, q: q || undefined });
  const totale = Object.values(conteggi).reduce((a, b) => a + (b ?? 0), 0);
  const nuova = can(user.role, "campagne:scrivi") ? (
    <Link href="/campagne/nuova" className="btn-primary">
      <Plus size={16} /> Nuova campagna
    </Link>
  ) : undefined;
  const href = (s?: WorkStatus) => `/campagne?${new URLSearchParams({ ...(s ? { stato: s } : {}), ...(q ? { q } : {}) })}`;

  return (
    <>
      <PageHeader title="Campagne" subtitle="Dall'obiettivo al piano: pubblico, funnel, canali, budget e calendario" action={nuova} />
      <Flash msg={sp.msg} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <nav className="flex flex-wrap gap-1" aria-label="Filtra per stato">
          <Link href={href()} aria-current={!stato ? "page" : undefined} className={clsx("rounded-full px-3 py-1.5 text-[13px] font-semibold", !stato ? "bg-navy text-white" : "bg-surface text-ink-soft ring-1 ring-line hover:bg-hover")}>
            Tutte <span className="num opacity-70">{totale}</span>
          </Link>
          {WORK_STATUS.filter((s) => conteggi[s]).map((s) => (
            <Link key={s} href={href(s)} aria-current={stato === s ? "page" : undefined} className={clsx("rounded-full px-3 py-1.5 text-[13px] font-semibold", stato === s ? "bg-navy text-white" : "bg-surface text-ink-soft ring-1 ring-line hover:bg-hover")}>
              {WORK_STATUS_UI[s].label} <span className="num opacity-70">{conteggi[s]}</span>
            </Link>
          ))}
        </nav>
        <form className="relative ml-auto w-full sm:w-64" role="search">
          {stato && <input type="hidden" name="stato" value={stato} />}
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input name="q" defaultValue={q} placeholder="Cerca campagna o UTM" className="input pl-9" aria-label="Cerca campagna" />
        </form>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={Megaphone} title={q || stato ? "Nessuna campagna trovata" : "Nessuna campagna"} text={q || stato ? "Prova a cambiare filtro o ricerca." : "Parti da un obiettivo commerciale."} action={!q && !stato ? nuova : undefined} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/campagne/${c.id}`} className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-2 px-4 py-3 hover:bg-hover/60 md:grid-cols-[minmax(0,1fr)_200px_120px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[14px] font-semibold">{c.name}</span>
                      <Badge tone={WORK_STATUS_UI[c.status].tone}>{WORK_STATUS_UI[c.status].label}</Badge>
                      <Badge tone={REPARTO_UI[c.reparto].tone}>{REPARTO_UI[c.reparto].label}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-ink-faint">{c.objective}</p>
                  </div>
                  <div className="self-center">
                    <Progress value={c.leadQual} max={c.leadTarget} label={`Lead qualificati di ${c.name}`} />
                    <p className="num mt-1 text-[12px] text-ink-soft">
                      {c.leadQual} / {c.leadTarget} lead qualificati
                    </p>
                  </div>
                  <div className="num self-center text-[12.5px] text-ink-soft md:text-right">
                    <div className="font-semibold text-ink">{euro(c.budget)}</div>
                    {c.startDate ? dataBreve(c.startDate) : "—"} → {c.endDate ? dataBreve(c.endDate) : "—"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
