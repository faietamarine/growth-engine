import { NextResponse } from "next/server";
import { apiUser, fileResponse } from "@/lib/auth/api";
import { getLeadMagnet } from "@/features/lead-magnets/service";
import { getLmTipo } from "@/lib/leadmagnets/catalog";
import { lmToMarkdown } from "@/lib/leadmagnets/markdown";
import { slugify } from "@/lib/campaigns/generate";
import { WORK_STATUS_UI } from "@/lib/labels";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const r = await apiUser("contenuti:scrivi");
  if ("error" in r) return r.error;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ errore: "Non valido" }, { status: 400 });
  const d = await getLeadMagnet(id);
  if (!d) return NextResponse.json({ errore: "Non trovato" }, { status: 404 });
  const md = lmToMarkdown(d.lm.title, d.lm.content, { tipo: getLmTipo(d.lm.type)?.nome ?? d.lm.type, campagna: d.campaign?.name, stato: WORK_STATUS_UI[d.lm.status].label });
  return fileResponse(md, `${slugify(d.lm.title) || "lead-magnet"}.md`, "text/markdown");
}
