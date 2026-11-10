import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Save } from "lucide-react";
import { db } from "@/db/client";
import { events } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { campaignOptions } from "@/features/funnels/service";
import { EventFields } from "@/features/events/event-fields";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { salvaEvento } from "../../actions";

export const metadata = { title: "Modifica evento" };
export const dynamic = "force-dynamic";

export default async function ModificaEventoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("eventi:scrivi");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const e = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!e) notFound();
  const campagne = await campaignOptions();
  // La campagna attuale resta tra le scelte anche se conclusa.
  const opz = e.campaignId && !campagne.some((c) => c.id === e.campaignId) ? [...campagne, { id: e.campaignId, name: "Campagna conclusa", status: "CONCLUSO" as const }] : campagne;
  return (
    <>
      <PageHeader title="Modifica evento" subtitle={e.name} />
      <div className="mx-auto max-w-2xl">
        <ActionForm action={salvaEvento.bind(null, id)} submit="Salva" icon={<Save size={16} />}>
          <EventFields e={e} tipo={e.type} campagne={opz} svolto={e.status === "CONCLUSO"} />
        </ActionForm>
      </div>
    </>
  );
}
