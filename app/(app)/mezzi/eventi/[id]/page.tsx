import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Save, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getEvento } from "@/features/vetrina/contenuti";
import { EventoFields } from "@/features/vetrina/contenuti-fields";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { eliminaEventoAction, salvaEventoAction } from "../../contenuti/actions";

export const metadata = { title: "Evento" };
export const dynamic = "force-dynamic";

export default async function EventoEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("contenuti:scrivi");
  const { id } = await params;
  const nuovo = id === "nuovo";
  if (!nuovo && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const e = nuovo ? null : await getEvento(id);
  if (!nuovo && !e) notFound();
  return (
    <>
      <Link href="/mezzi/eventi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Eventi e prove in mare
      </Link>
      <PageHeader
        title={e ? e.titolo : "Nuovo evento"}
        subtitle={e?.stato === "PUBBLICATO" ? `Online su /vetrina/eventi/${e.slug}` : "In bozza finché non scegli «Pubblicato sul sito»"}
        action={
          e?.stato === "PUBBLICATO" ? (
            <Link href={`/vetrina/eventi/${e.slug}`} target="_blank" className="btn-ghost">
              <ExternalLink size={16} /> Vedi sul sito
            </Link>
          ) : undefined
        }
      />
      <div className="mx-auto max-w-3xl space-y-4">
        <ActionForm action={salvaEventoAction.bind(null, e?.id ?? null)} submit="Salva" icon={<Save size={16} />}>
          <EventoFields e={e} />
        </ActionForm>
        {e && (
          <form action={eliminaEventoAction} className="flex justify-end">
            <input type="hidden" name="id" value={e.id} />
            <SubmitButton className="btn-ghost text-danger" confirm="Elimino l'evento? Le iscrizioni già arrivate restano tra i lead.">
              <Trash2 size={16} /> Elimina evento
            </SubmitButton>
          </form>
        )}
      </div>
    </>
  );
}
