import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { editScope } from "@/lib/campaigns/status";
import { PageHeader } from "@/components/layout/page-header";
import { WORK_STATUS_UI } from "@/lib/labels";
import { EditForm } from "./edit-form";

export const metadata = { title: "Modifica campagna" };
export const dynamic = "force-dynamic";

const SOTTOTITOLO = {
  tutto: "Puoi cambiare strategia, testi, date e budget.",
  operativo: "Campagna in corso: puoi aggiornare spesa, data di fine e obiettivo lead.",
  spesa: "Campagna conclusa: puoi solo aggiornare la spesa sostenuta.",
} as const;

export default async function ModificaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("campagne:scrivi");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await db.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
  if (!c) notFound();
  const scope = editScope(c.status);
  return (
    <>
      <PageHeader title={`Modifica: ${c.name}`} subtitle={`${WORK_STATUS_UI[c.status].label} · ${SOTTOTITOLO[scope]}`} />
      <EditForm c={c} scope={scope} />
    </>
  );
}
