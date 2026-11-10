import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { LM_TIPI, getLmTipo } from "@/lib/leadmagnets/catalog";
import { campaignOptions } from "@/features/funnels/service";
import { Creator } from "./creator";

export const metadata = { title: "Nuovo lead magnet" };
export const dynamic = "force-dynamic";

export default async function NuovoLmPage({ searchParams }: { searchParams: Promise<{ tipo?: string; campagna?: string }> }) {
  await requireUser("contenuti:scrivi");
  const sp = await searchParams;
  const campagne = await campaignOptions();
  return (
    <>
      <PageHeader title="Nuovo lead magnet" subtitle="Scegli cosa offrire: preparo titolo, testi della landing, annunci, email, WhatsApp, prompt e checklist." />
      <Creator
        tipi={LM_TIPI.map(({ key, nome, descrizione, icona }) => ({ key, nome, descrizione, icona }))}
        campagne={campagne}
        tipoIniziale={sp.tipo && getLmTipo(sp.tipo) ? sp.tipo : undefined}
        campagnaIniziale={campagne.some((c) => c.id === sp.campagna) ? sp.campagna : undefined}
      />
    </>
  );
}
