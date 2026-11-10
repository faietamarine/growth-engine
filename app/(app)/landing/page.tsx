import Link from "next/link";
import { Plus, PanelsTopLeft, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { listLandings } from "@/features/landing/service";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/ui/flash";
import { WORK_STATUS_UI, dataBreve } from "@/lib/labels";

export const metadata = { title: "Landing page" };
export const dynamic = "force-dynamic";

const pct = (lead: number, visite: number) => (visite > 0 ? `${((lead / visite) * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%` : "—");

export default async function LandingListPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const user = await requireUser();
  const { msg } = await searchParams;
  const rows = await listLandings();
  const nuova = can(user.role, "contenuti:scrivi") ? (
    <Link href="/landing/nuova" className="btn-primary">
      <Plus size={16} /> Nuova landing
    </Link>
  ) : undefined;
  return (
    <>
      <PageHeader title="Landing page" subtitle="Le pagine online che raccolgono i lead delle campagne" action={nuova} />
      <Flash msg={msg} />
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={PanelsTopLeft} title="Nessuna landing" text="Creala da un funnel o da un lead magnet: i testi e il form arrivano già pronti." action={nuova} />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((l) => {
              const visite = l.visits + l.visitsB;
              const online = l.status === "PUBBLICATO";
              return (
                <li key={l.id} className="grid grid-cols-[minmax(0,1fr)] gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/landing/${l.id}`} className="truncate text-[14px] font-semibold hover:text-navy hover:underline">
                        {l.title}
                      </Link>
                      <Badge tone={online ? "ok" : WORK_STATUS_UI[l.status].tone}>{online ? "Online" : WORK_STATUS_UI[l.status].label}</Badge>
                      {l.abTest?.attivo && <Badge tone="aqua">Test A/B</Badge>}
                    </div>
                    <p className="truncate text-[12.5px] text-ink-faint">
                      /l/{l.slug} · {l.campaignName ?? "nessuna campagna"}
                      {l.publishedAt && ` · online dal ${dataBreve(l.publishedAt)}`}
                    </p>
                  </div>
                  <div className="num flex items-center gap-4 text-[12.5px] text-ink-soft md:justify-end">
                    <span>
                      <b className="text-ink">{visite}</b> visite
                    </span>
                    <span>
                      <b className="text-ink">{l.leadCount}</b> lead
                    </span>
                    <span title="Lead / visite">conv. {pct(l.leadCount, visite)}</span>
                    {online && (
                      <a href={`/l/${l.slug}`} target="_blank" rel="noopener" className="text-navy" aria-label={`Apri ${l.title} online`}>
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
