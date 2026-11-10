import Link from "next/link";
import { Plus, Magnet } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { listLeadMagnets } from "@/features/lead-magnets/service";
import { getLmTipo } from "@/lib/leadmagnets/catalog";
import { LmIcon } from "@/features/lead-magnets/lm-icon";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/ui/flash";
import { WORK_STATUS_UI, dataBreve } from "@/lib/labels";

export const metadata = { title: "Lead magnet" };
export const dynamic = "force-dynamic";

export default async function LeadMagnetPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const user = await requireUser();
  const { msg } = await searchParams;
  const rows = await listLeadMagnets();
  const nuovo = can(user.role, "contenuti:scrivi") ? (
    <Link href="/lead-magnet/nuovo" className="btn-primary">
      <Plus size={16} /> Nuovo lead magnet
    </Link>
  ) : undefined;
  return (
    <>
      <PageHeader title="Lead magnet" subtitle="Quello che offri in cambio del contatto: guide, checklist, quiz, prove in mare, valutazioni, buoni" action={nuovo} />
      <Flash msg={msg} />
      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={Magnet} title="Nessun lead magnet" text="Scegli un tipo e ricevi una bozza completa, pronta da rivedere." action={nuovo} />
        </div>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((lm) => {
            const t = getLmTipo(lm.type);
            const fatte = lm.content.checklist.filter((c) => c.fatto).length;
            return (
              <li key={lm.id}>
                <Link href={`/lead-magnet/${lm.id}`} className="card flex h-full flex-col p-4 transition-shadow hover:shadow-pop">
                  <div className="flex items-center gap-2">
                    <span className="text-gold">{t && <LmIcon icona={t.icona} size={16} />}</span>
                    <span className="text-[12px] font-semibold text-ink-soft">{t?.nome ?? lm.type}</span>
                    <Badge tone={WORK_STATUS_UI[lm.status].tone} className="ml-auto">
                      {WORK_STATUS_UI[lm.status].label}
                    </Badge>
                  </div>
                  <h2 className="mt-2 flex-1 font-display text-[15.5px] font-semibold leading-snug">{lm.title}</h2>
                  <p className="mt-1 truncate text-[12.5px] text-ink-faint">{lm.campaignName ?? "Nessuna campagna"}</p>
                  <div className="mt-3">
                    <Progress value={fatte} max={lm.content.checklist.length} label="Checklist di pubblicazione" />
                    <p className="num mt-1 flex justify-between text-[12px] text-ink-soft">
                      <span>
                        Checklist {fatte}/{lm.content.checklist.length}
                      </span>
                      <span>{dataBreve(lm.updatedAt)}</span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
