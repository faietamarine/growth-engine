import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { formOptions } from "@/features/calendar/service";
import { TaskFields } from "@/features/calendar/task-fields";
import { dataItalia } from "@/lib/crm/nautilus";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { creaAttivita } from "../actions";

export const metadata = { title: "Nuova attività" };
export const dynamic = "force-dynamic";

export default async function NuovaAttivitaPage({ searchParams }: { searchParams: Promise<{ data?: string; campagna?: string; ritorno?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const opz = await formOptions();
  const data = sp.data && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : dataItalia(new Date());
  const ritorno = sp.ritorno && /^\/calendario(\?[\w=&%.-]*)?$/.test(sp.ritorno) ? sp.ritorno : "/calendario?vista=elenco";
  return (
    <>
      <PageHeader title="Nuova attività" subtitle="Una cosa da produrre, con scadenza e responsabile" />
      <div className="mx-auto max-w-2xl">
        <ActionForm action={creaAttivita} submit="Aggiungi" icon={<Plus size={16} />}>
          <TaskFields opz={opz} ritorno={ritorno} t={{ dueDate: data, assigneeId: user.id, campaignId: opz.campagne.some((c) => c.id === sp.campagna) ? sp.campagna : null }} />
        </ActionForm>
      </div>
    </>
  );
}
