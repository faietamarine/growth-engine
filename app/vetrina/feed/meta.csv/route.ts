import { mezziPubblici } from "@/features/vetrina/service";
import { csvMeta } from "@/lib/vetrina/feed-meta";
import { siteUrl } from "@/lib/seo/site";
import { oggiRoma } from "@/lib/vetrina/promo";

export const dynamic = "force-dynamic";

/** Catalogo per Meta (WhatsApp Business, Facebook, Instagram): Commerce Manager lo scarica una volta al giorno. */
export async function GET() {
  const { testo } = csvMeta(await mezziPubblici(), siteUrl(), oggiRoma());
  return new Response(testo, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-robots-tag": "noindex",
    },
  });
}
