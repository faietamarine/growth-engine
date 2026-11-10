import Link from "next/link";
import { Plus, PartyPopper, MapPin, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { listEvents } from "@/features/events/service";
import { EventIcon } from "@/features/events/event-icon";
import { tipoOrDefault } from "@/lib/events/catalog";
import { dataItalia } from "@/lib/crm/nautilus";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Flash } from "@/components/ui/flash";
import { EVENT_STATUS_UI } from "@/lib/labels";

export const metadata = { title: "Eventi" };
export const dynamic = "force-dynamic";

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export default async function EventiPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const user = await requireUser();
  const { msg } = await searchParams;
  const rows = await listEvents();
  const oggi = dataItalia(new Date());
  const prossimi = rows.filter((e) => e.date >= oggi && e.status !== "CONCLUSO");
  const passati = rows.filter((e) => !(e.date >= oggi && e.status !== "CONCLUSO")).reverse();
  const nuovo = can(user.role, "eventi:scrivi") ? (
    <Link href="/eventi/nuovo" className="btn-primary">
      <Plus size={16} /> Nuovo evento
    </Link>
  ) : undefined;

  const lista = (items: typeof rows) => (
    <ul className="divide-y divide-line">
      {items.map((e) => {
        const t = tipoOrDefault(e.type);
        const [, m, g] = e.date.split("-");
        const n = e.numeri;
        return (
          <li key={e.id}>
            <Link href={`/eventi/${e.id}`} className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3 hover:bg-hover/60 md:grid-cols-[52px_minmax(0,1fr)_220px]">
              <div className="flex h-[52px] flex-col items-center justify-center rounded-md bg-navy/[.06] text-navy">
                <span className="num font-display text-[19px] font-semibold leading-none">{Number(g)}</span>
                <span className="text-[11px] font-semibold uppercase">{MESI[Number(m) - 1]}</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[14px] font-semibold">{e.name}</span>
                  <Badge tone={EVENT_STATUS_UI[e.status].tone}>{EVENT_STATUS_UI[e.status].label}</Badge>
                </div>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-soft">
                  <span className="inline-flex items-center gap-1 text-gold">
                    <EventIcon icona={t.icona} size={14} /> <span className="text-ink-soft">{t.nome}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} /> {e.time}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin size={13} /> <span className="truncate">{e.venue}</span>
                  </span>
                </p>
              </div>
              <div className="col-start-2 self-center md:col-start-3">
                {e.capacity > 0 ? <Progress value={n.iscritti} max={e.capacity} label={`Iscritti a ${e.name}`} /> : null}
                <p className="num mt-1 text-[12px] text-ink-soft">
                  {n.iscritti} iscritti{e.capacity > 0 ? ` su ${e.capacity}` : ""}
                  {n.presenti + n.sulPosto > 0 ? ` · ${n.presenti + n.sulPosto} presenti` : ""}
                  {!e.landing ? " · senza pagina di iscrizione" : ""}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <PageHeader title="Eventi" subtitle="Open day, prove in mare, saloni, webinar: iscrizioni, presenze e contatti raccolti" action={nuovo} />
      <Flash msg={msg} />
      {rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={PartyPopper} title="Nessun evento" text="Crea il primo: checklist, inviti e pagina di iscrizione arrivano già pronti." action={nuovo} />
        </div>
      ) : (
        <div className="space-y-5">
          <section className="card overflow-hidden">
            <div className="card-head">
              <h2 className="card-title">In programma</h2>
              <span className="num text-[12.5px] text-ink-faint">{prossimi.length}</span>
            </div>
            {prossimi.length ? lista(prossimi) : <p className="px-4 py-6 text-sm text-ink-soft">Nessun evento in programma.</p>}
          </section>
          {passati.length > 0 && (
            <section className="card overflow-hidden">
              <div className="card-head">
                <h2 className="card-title">Svolti e passati</h2>
                <span className="num text-[12.5px] text-ink-faint">{passati.length}</span>
              </div>
              {lista(passati)}
            </section>
          )}
        </div>
      )}
    </>
  );
}
