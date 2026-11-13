import { leggiFoto } from "@/features/vetrina/service";

export const dynamic = "force-dynamic";

/* Foto pubbliche della vetrina. L'identificativo è casuale e la foto non cambia mai: cache lunga. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Non trovata", { status: 404 });
  const f = await leggiFoto(id);
  if (!f) return new Response("Non trovata", { status: 404 });
  return new Response(new Uint8Array(f.data), {
    headers: { "content-type": f.mime, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" },
  });
}
