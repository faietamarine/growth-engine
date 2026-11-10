import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { funnels } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { funnelEditable } from "@/lib/campaigns/status";
import { campaignOptions } from "@/features/funnels/service";
import { PageHeader } from "@/components/layout/page-header";
import { FunnelEditor } from "./editor";

export const metadata = { title: "Modifica funnel" };
export const dynamic = "force-dynamic";

export default async function ModificaFunnelPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("funnel:scrivi");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const f = await db.query.funnels.findFirst({ where: eq(funnels.id, id) });
  if (!f) notFound();
  if (!funnelEditable(f.status)) redirect(`/funnel/${id}?msg=${encodeURIComponent("Questo funnel è pubblicato: crea una nuova versione per modificarlo.")}`);
  const campagne = await campaignOptions();
  // La campagna collegata resta nell'elenco anche se nel frattempo è stata conclusa.
  if (f.campaignId && !campagne.some((c) => c.id === f.campaignId)) {
    const c = await db.query.campaigns.findFirst({ where: (t, { eq: e }) => e(t.id, f.campaignId!), columns: { id: true, name: true, status: true } });
    if (c) campagne.unshift(c);
  }
  return (
    <>
      <PageHeader title={`Modifica: ${f.name}`} subtitle={f.status === "APPROVATO" ? "Il funnel è approvato: salvando torna in revisione." : "Le modifiche si salvano con il pulsante in basso."} />
      <FunnelEditor f={f} campagne={campagne} />
    </>
  );
}
