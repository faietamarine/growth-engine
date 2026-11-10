import { desc, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { funnels, leadMagnets } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { campaignOptions } from "@/features/funnels/service";
import { PageHeader } from "@/components/layout/page-header";
import { NuovaLandingForm } from "./form";

export const metadata = { title: "Nuova landing" };
export const dynamic = "force-dynamic";

export default async function NuovaLandingPage({ searchParams }: { searchParams: Promise<{ funnel?: string; magnet?: string; campagna?: string }> }) {
  await requireUser("contenuti:scrivi");
  const sp = await searchParams;
  const [f, m, c] = await Promise.all([
    db.select({ id: funnels.id, name: funnels.name }).from(funnels).where(ne(funnels.status, "CONCLUSO")).orderBy(desc(funnels.updatedAt)),
    db.select({ id: leadMagnets.id, name: leadMagnets.title }).from(leadMagnets).where(ne(leadMagnets.status, "CONCLUSO")).orderBy(desc(leadMagnets.updatedAt)),
    campaignOptions(),
  ]);
  const ok = (lista: { id: string }[], v?: string) => (v && lista.some((x) => x.id === v) ? v : undefined);
  const funnelId = ok(f, sp.funnel);
  return (
    <>
      <PageHeader title="Nuova landing" subtitle="Scegli da dove partire: la prima bozza arriva già con testi e form, poi la rifinisci nell'editor." />
      <NuovaLandingForm
        funnel={f}
        magnet={m}
        campagne={c}
        preset={{ funnelId, leadMagnetId: ok(m, sp.magnet), campaignId: ok(c, sp.campagna), title: f.find((x) => x.id === funnelId)?.name.split(" — ")[0] }}
      />
    </>
  );
}
