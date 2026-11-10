import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { leadMagnets } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { funnelEditable } from "@/lib/campaigns/status";
import { campaignOptions } from "@/features/funnels/service";
import { PageHeader } from "@/components/layout/page-header";
import { LmEditor } from "./editor";

export const metadata = { title: "Modifica lead magnet" };
export const dynamic = "force-dynamic";

export default async function ModificaLmPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("contenuti:scrivi");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const lm = await db.query.leadMagnets.findFirst({ where: eq(leadMagnets.id, id) });
  if (!lm) notFound();
  if (!funnelEditable(lm.status)) redirect(`/lead-magnet/${id}?msg=${encodeURIComponent("È pubblicato: crea una nuova versione per modificarlo.")}`);
  const campagne = await campaignOptions();
  if (lm.campaignId && !campagne.some((c) => c.id === lm.campaignId)) {
    const c = await db.query.campaigns.findFirst({ where: (t, { eq: e }) => e(t.id, lm.campaignId!), columns: { id: true, name: true, status: true } });
    if (c) campagne.unshift(c);
  }
  return (
    <>
      <PageHeader title={`Modifica: ${lm.title}`} subtitle={lm.status === "APPROVATO" ? "È approvato: salvando torna in revisione." : "I contatori diventano rossi quando un testo supera i limiti di Google o Meta."} />
      <LmEditor lm={lm} campagne={campagne} />
    </>
  );
}
