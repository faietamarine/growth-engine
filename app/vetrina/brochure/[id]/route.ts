import { getMezzo, leggiFoto } from "@/features/vetrina/service";
import { getMarchio } from "@/lib/brands/catalog";

export const dynamic = "force-dynamic";

/* Scarica la brochure PDF di un mezzo online. Si arriva qui dal modulo "Scarica la brochure" della scheda. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Non trovata", { status: 404 });
  const m = await getMezzo(id);
  if (!m || m.stato === "BOZZA" || !m.brochure) return new Response("Non trovata", { status: 404 });
  const f = await leggiFoto(m.brochure);
  if (!f) return new Response("Non trovata", { status: 404 });
  const nome = `${getMarchio(m.marca)?.nome ?? m.marca}-${m.modello}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  return new Response(new Uint8Array(f.data), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${nome}.pdf"`, "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" },
  });
}
