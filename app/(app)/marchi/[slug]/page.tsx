import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { getMarchio } from "@/lib/brands/catalog";
import { campagneDelMarchio } from "@/features/brands/service";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { REPARTO_UI, WORK_STATUS_UI, euro } from "@/lib/labels";
import { formatIt } from "@/lib/campaigns/generate";

export const dynamic = "force-dynamic";

export default async function MarchioPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const m = getMarchio((await params).slug);
  if (!m) notFound();
  const campagne = await campagneDelMarchio(m);
  const attive = campagne.filter((c) => c.status === "PUBBLICATO").length;
  const leadTot = campagne.reduce((t, c) => t + c.leadTot, 0);
  const leadQual = campagne.reduce((t, c) => t + c.leadQual, 0);

  return (
    <>
      <PageHeader
        title={m.nome}
        subtitle={m.nota ?? "Campagne e lead dedicati a questo marchio"}
        action={
          can(user.role, "campagne:scrivi") ? (
            <Link href={`/campagne/nuova?marchio=${m.slug}`} className="btn-primary">
              <Plus size={16} /> Nuova campagna per {m.nome}
            </Link>
          ) : undefined
        }
      />

      <div className="card mb-4 flex items-center justify-center bg-white p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.logo} alt={`Logo ${m.nome}`} className="max-h-24 max-w-full object-contain" />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Riepilogo del marchio">
        <div className="card p-4"><div className="text-[12px] text-ink-soft">Campagne attive</div><div className="num text-2xl font-semibold">{attive}</div></div>
        <div className="card p-4"><div className="text-[12px] text-ink-soft">Campagne in totale</div><div className="num text-2xl font-semibold">{campagne.length}</div></div>
        {can(user.role, "lead:vedi") && <div className="card p-4"><div className="text-[12px] text-ink-soft">Lead raccolti</div><div className="num text-2xl font-semibold">{leadTot}</div></div>}
        {can(user.role, "lead:vedi") && <div className="card p-4"><div className="text-[12px] text-ink-soft">Qualificati</div><div className="num text-2xl font-semibold">{leadQual}</div></div>}
      </section>

      <section className="mt-6" aria-label="Campagne del marchio">
        <h2 className="mb-2 text-[15px] font-semibold">Campagne</h2>
        {campagne.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-soft">
            Nessuna campagna per {m.nome} ancora. {can(user.role, "campagne:scrivi") && "Creane una con il pulsante in alto."}
          </div>
        ) : (
          <div className="card divide-y divide-line overflow-hidden">
            {campagne.map((c) => (
              <Link key={c.id} href={`/campagne/${c.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-hover">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{c.name}</div>
                  <div className="text-[12.5px] text-ink-soft">
                    <span className="num">{formatIt(c.startDate ?? "")}</span> → <span className="num">{formatIt(c.endDate ?? "")}</span> · budget <span className="num">{euro(c.budget)}</span>
                  </div>
                </div>
                <Badge tone={REPARTO_UI[c.reparto].tone}>{REPARTO_UI[c.reparto].label}</Badge>
                <Badge tone={WORK_STATUS_UI[c.status].tone}>{WORK_STATUS_UI[c.status].label}</Badge>
                {can(user.role, "lead:vedi") && <span className="num text-[12.5px] text-ink-soft">{c.leadTot} lead</span>}
                <ArrowRight size={16} className="text-ink-faint" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
