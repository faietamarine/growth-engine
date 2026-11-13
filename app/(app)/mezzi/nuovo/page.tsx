import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { MezzoFields } from "@/features/vetrina/mezzo-fields";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { creaMezzoAction } from "../actions";

export const metadata = { title: "Nuovo mezzo" };
export const dynamic = "force-dynamic";

export default async function NuovoMezzoPage() {
  await requireUser("contenuti:scrivi");
  return (
    <>
      <PageHeader title="Nuovo mezzo" subtitle="Per metterlo online scegli lo stato «Online» e aggiungi almeno una foto" />
      <div className="mx-auto max-w-3xl">
        <ActionForm action={creaMezzoAction} submit="Salva" icon={<Plus size={16} />}>
          <MezzoFields />
        </ActionForm>
      </div>
    </>
  );
}
