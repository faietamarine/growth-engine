import { apiUser, fileResponse } from "@/lib/auth/api";
import { registrantsCsv } from "@/features/events/service";
import { slugify } from "@/lib/campaigns/generate";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await apiUser("lead:vedi");
  if ("error" in r) return r.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Non trovato", { status: 404 });
  const x = await registrantsCsv(id);
  if (!x) return new Response("Non trovato", { status: 404 });
  return fileResponse(x.csv, `iscritti-${slugify(x.nome, 40)}.csv`, "text/csv");
}
