import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { landingPages } from "@/db/schema";
import { apiUser } from "@/lib/auth/api";
import { urlPubblico } from "@/lib/landing/url";
import { utmQuery } from "@/lib/campaigns/utm";

/** QR code della landing (PNG per la stampa, SVG per i grafici). Per eventi e volantini il link porta utm evento/qr. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await apiUser("lead:vedi");
  if ("error" in r) return r.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ errore: "Non valido" }, { status: 400 });
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.id, id) });
  if (!l) return NextResponse.json({ errore: "Non trovata" }, { status: 404 });
  const camp = l.campaignId ? await db.query.campaigns.findFirst({ where: (t, { eq: e }) => e(t.id, l.campaignId!), columns: { utmCampaign: true } }) : null;
  const url = `${urlPubblico(l.slug)}?${utmQuery("EVENTO", camp?.utmCampaign ?? l.slug)}`;
  const formato = new URL(req.url).searchParams.get("formato") === "svg" ? "svg" : "png";
  const nome = `qr-${l.slug}.${formato}`;
  if (formato === "svg") {
    const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#0C1A30", light: "#FFFFFF" } });
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `attachment; filename="${nome}"`, "Cache-Control": "no-store" } });
  }
  const png = await QRCode.toBuffer(url, { width: 1200, margin: 2, errorCorrectionLevel: "M", color: { dark: "#0C1A30", light: "#FFFFFF" } });
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${nome}"`, "Cache-Control": "no-store" } });
}
