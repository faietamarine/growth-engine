import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save, Trash2, Link2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { formOptions, getTask } from "@/features/calendar/service";
import { TaskFields } from "@/features/calendar/task-fields";
import { scadenzaIncoerente } from "@/lib/calendar/logic";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { TASK_STATUS_UI } from "@/lib/labels";
import { eliminaAttivita, salvaAttivita } from "../actions";

export const metadata = { title: "Attività" };
export const dynamic = "force-dynamic";

export default async function AttivitaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ritorno?: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await getTask(id);
  if (!d) notFound();
  const sp = await searchParams;
  const ritorno = sp.ritorno && /^\/calendario(\?[\w=&%.-]*)?$/.test(sp.ritorno) ? sp.ritorno : "/calendario?vista=elenco";
  const opz = await formOptions();
  const t = d.task;
  return (
    <>
      <Link href={ritorno} className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Calendario
      </Link>
      <PageHeader title={t.title} subtitle="Modifica scadenza, responsabile, stato e dipendenze" />
      <div className="mx-auto max-w-2xl space-y-4">
        {(d.dipendenza || d.dipendenti.length > 0) && (
          <div className="card space-y-2 p-4 text-[13px]">
            {d.dipendenza && (
              <p className="flex flex-wrap items-center gap-2">
                <Link2 size={14} className="text-gold" /> Dipende da
                <Link href={`/calendario/${d.dipendenza.id}`} className="font-semibold text-navy hover:underline">
                  {d.dipendenza.title}
                </Link>
                <Badge tone={TASK_STATUS_UI[d.dipendenza.status].tone}>{TASK_STATUS_UI[d.dipendenza.status].label}</Badge>
                {scadenzaIncoerente(t.dueDate, d.dipendenza) && <span className="text-warn">La scadenza è prima di quella da cui dipende.</span>}
              </p>
            )}
            {d.dipendenti.map((x) => (
              <p key={x.id} className="flex flex-wrap items-center gap-2">
                <Link2 size={14} className="text-ink-faint" /> Blocca
                <Link href={`/calendario/${x.id}`} className="font-semibold text-navy hover:underline">
                  {x.title}
                </Link>
                <Badge tone={TASK_STATUS_UI[x.status].tone}>{TASK_STATUS_UI[x.status].label}</Badge>
              </p>
            ))}
          </div>
        )}
        <ActionForm action={salvaAttivita.bind(null, id)} submit="Salva" icon={<Save size={16} />}>
          <TaskFields t={t} opz={opz} ritorno={ritorno} />
        </ActionForm>
        <form action={eliminaAttivita} className="flex justify-end">
          <input type="hidden" name="id" value={id} />
          <SubmitButton className="btn-ghost text-danger" confirm={d.dipendenti.length ? "Eliminare l'attività? Le attività che dipendono da questa resteranno senza dipendenza." : "Eliminare l'attività?"}>
            <Trash2 size={15} /> Elimina attività
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
