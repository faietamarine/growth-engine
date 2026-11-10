import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { campaignOptions } from "@/features/funnels/service";
import { EventFields } from "@/features/events/event-fields";
import { EventIcon } from "@/features/events/event-icon";
import { TIPI_EVENTO, getTipoEvento } from "@/lib/events/catalog";
import { REPARTO_UI } from "@/lib/labels";
import { addDays } from "@/lib/campaigns/generate";
import { dataItalia } from "@/lib/crm/nautilus";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { creaEvento } from "../actions";

export const metadata = { title: "Nuovo evento" };
export const dynamic = "force-dynamic";

export default async function NuovoEventoPage({ searchParams }: { searchParams: Promise<{ tipo?: string; campagna?: string }> }) {
  await requireUser("eventi:scrivi");
  const sp = await searchParams;
  const tipo = sp.tipo ? getTipoEvento(sp.tipo) : undefined;

  if (!tipo) {
    return (
      <>
        <PageHeader title="Nuovo evento" subtitle="Scegli il tipo: checklist, copione per lo staff, inviti e follow-up arrivano già pronti." />
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TIPI_EVENTO.map((t) => (
            <li key={t.key}>
              <Link href={`/eventi/nuovo?tipo=${t.key}${sp.campagna ? `&campagna=${encodeURIComponent(sp.campagna)}` : ""}`} className="card flex h-full flex-col gap-2 p-4 hover:ring-gold/60">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-gold/15 text-gold">
                    <EventIcon icona={t.icona} />
                  </span>
                  <span className="font-semibold">{t.nome}</span>
                </div>
                <p className="text-[13px] text-ink-soft">{t.descrizione}</p>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  <Badge tone={REPARTO_UI[t.reparto].tone}>{REPARTO_UI[t.reparto].label}</Badge>
                  <Badge tone="neutral">{t.checklist.length} voci checklist</Badge>
                  <Badge tone="neutral">{t.messaggi.length} messaggi</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const campagne = await campaignOptions();
  const campagna = campagne.find((c) => c.id === sp.campagna)?.id ?? null;
  return (
    <>
      <PageHeader title={`Nuovo evento: ${tipo.nome}`} subtitle={tipo.descrizione} />
      <div className="mx-auto max-w-2xl">
        <Link href="/eventi/nuovo" className="mb-3 inline-block text-[13px] font-semibold text-ink-soft hover:text-navy">
          ← Cambia tipo
        </Link>
        <ActionForm action={creaEvento} submit="Crea l'evento" icon={<Plus size={16} />}>
          <EventFields tipo={tipo.key} campagne={campagne} e={{ date: addDays(dataItalia(new Date()), 21), objective: tipo.obiettivo, campaignId: campagna, capacity: tipo.key === "prova-mare" ? 24 : tipo.key === "webinar" ? 100 : 0 }} />
        </ActionForm>
      </div>
    </>
  );
}
