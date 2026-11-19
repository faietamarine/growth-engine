import type { MetadataRoute } from "next";
import { mezziPubblici } from "@/features/vetrina/service";
import { MARCHI } from "@/lib/brands/catalog";
import { pagineLocali } from "@/lib/seo/locali";
import { siteUrl } from "@/lib/seo/site";
import { eventiInArrivo, postPubblici } from "@/features/vetrina/contenuti";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [tutti, articoli, eventi] = await Promise.all([mezziPubblici(), postPubblici(500), eventiInArrivo(200)]);
  const mezzi = tutti.filter((m) => m.stato === "PUBBLICATO");
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/vetrina/mezzi`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/vetrina/servizi`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/vetrina/valuta`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/vetrina/quiz`, changeFrequency: "monthly", priority: 0.4 },
    ...MARCHI.map((x) => ({ url: `${base}/vetrina/marchi/${x.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...pagineLocali().map((p) => ({ url: `${base}/vetrina/p/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...(articoli.length ? [{ url: `${base}/vetrina/blog`, changeFrequency: "weekly" as const, priority: 0.6 }] : []),
    ...articoli.map((p) => ({ url: `${base}/vetrina/blog/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...(eventi.length ? [{ url: `${base}/vetrina/eventi`, changeFrequency: "weekly" as const, priority: 0.7 }] : []),
    ...eventi.map((e) => ({ url: `${base}/vetrina/eventi/${e.slug}`, lastModified: e.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...mezzi.map((m) => ({ url: `${base}/vetrina/mezzo/${m.id}`, lastModified: m.updatedAt, changeFrequency: "weekly" as const, priority: m.condizione === "DA_ORDINARE" ? 0.5 : 0.7 })),
  ];
}
