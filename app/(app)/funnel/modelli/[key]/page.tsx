import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { getTemplate } from "@/lib/funnels/templates";
import { campaignOptions } from "@/features/funnels/service";
import { FunnelView } from "@/features/funnels/funnel-view";
import { Badge } from "@/components/ui/badge";
import { REPARTO_UI } from "@/lib/labels";
import { UseTemplate } from "./use-template";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  return { title: getTemplate((await params).key)?.nome ?? "Modello" };
}

export default async function ModelloPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ campagna?: string }> }) {
  const user = await requireUser();
  const t = getTemplate((await params).key);
  if (!t) notFound();
  const { campagna } = await searchParams;
  const campagne = can(user.role, "funnel:scrivi") ? await campaignOptions() : [];
  return (
    <>
      <Link href="/funnel" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Libreria funnel
      </Link>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Modello</Badge>
        <Badge tone="info">{t.categoria}</Badge>
        <Badge tone={REPARTO_UI[t.reparto].tone}>Lead in Nautilus EVO: {REPARTO_UI[t.reparto].label}</Badge>
      </div>
      <h1 className="font-display text-[22px] font-semibold leading-tight lg:text-[26px]">{t.nome}</h1>
      <p className="mb-5 mt-1 text-sm text-ink-soft">{t.obiettivo}</p>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 lg:order-1">
          <FunnelView f={{ obiettivo: t.obiettivo, pubblico: t.pubblico, promessa: t.promessa, leadMagnet: t.leadMagnet, cta: t.cta, steps: t.steps, form: t.form, emails: t.emails, whatsapp: t.whatsapp, qualificazione: t.qualificazione, conversioneAttesa: t.conversioneAttesa }} />
        </div>
        {can(user.role, "funnel:scrivi") && (
          <aside className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-16">
              <UseTemplate templateKey={t.key} defaultName={t.nome} campagne={campagne} campagnaPreselezionata={campagne.some((c) => c.id === campagna) ? campagna : undefined} />
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
