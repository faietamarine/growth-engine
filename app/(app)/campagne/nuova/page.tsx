import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { dataItalia } from "@/lib/crm/nautilus";
import { addDays } from "@/lib/campaigns/generate";
import { Wizard } from "./wizard";

export const metadata = { title: "Nuova campagna" };

export default async function NuovaCampagnaPage() {
  await requireUser("campagne:scrivi");
  // Partenza proposta tra 14 giorni: il tempo di preparare annunci e landing.
  const start = addDays(dataItalia(new Date()), 14);
  return (
    <>
      <PageHeader title="Nuova campagna" subtitle="Scrivi l'obiettivo: propongo pubblico, promessa, funnel, canali, budget e calendario. Poi lo rivedi e lo salvi." />
      <Wizard defaultStart={start} />
    </>
  );
}
