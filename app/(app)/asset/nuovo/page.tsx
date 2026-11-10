import { eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { campaignOptions } from "@/features/funnels/service";
import { AssetFields } from "@/features/assets/asset-fields";
import { TIPI_ASSET } from "@/lib/assets/catalog";
import { PageHeader } from "@/components/layout/page-header";
import { ActionForm } from "@/components/ui/action-form";
import { creaAsset } from "../actions";

export const metadata = { title: "Nuovo asset" };
export const dynamic = "force-dynamic";

export default async function NuovoAssetPage({ searchParams }: { searchParams: Promise<{ campagna?: string; tipo?: string }> }) {
  const user = await requireUser("contenuti:scrivi");
  const sp = await searchParams;
  const [campagne, utenti] = await Promise.all([campaignOptions(), db.select({ id: users.id, name: users.name }).from(users).where(eq(users.active, true))]);
  return (
    <>
      <PageHeader title="Nuovo asset" subtitle="Parte come idea: lo porti avanti fino alla pubblicazione" />
      <div className="mx-auto max-w-2xl">
        <ActionForm action={creaAsset} submit="Crea" icon={<Plus size={16} />}>
          <AssetFields
            campagne={campagne}
            utenti={utenti}
            a={{ authorId: user.id, campaignId: campagne.some((c) => c.id === sp.campagna) ? sp.campagna : null, type: (TIPI_ASSET as readonly string[]).includes(sp.tipo ?? "") ? sp.tipo : undefined }}
          />
        </ActionForm>
      </div>
    </>
  );
}
