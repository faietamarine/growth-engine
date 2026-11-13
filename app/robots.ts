import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/site";

/** Google può leggere solo il sito pubblico: l'area riservata e le API restano fuori. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/$", "/vetrina", "/media/", "/brand/"], disallow: ["/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
