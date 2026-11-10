import { apiUser, fileResponse } from "@/lib/auth/api";
import { exportCsv, type LeadView } from "@/features/leads/service";
import { dataItalia } from "@/lib/crm/nautilus";

const VISTE: LeadView[] = ["coda", "consegnati", "non-qualificati", "tutti"];

export async function GET(req: Request) {
  const r = await apiUser("lead:vedi");
  if ("error" in r) return r.error;
  const v = new URL(req.url).searchParams.get("vista") as LeadView;
  const vista = VISTE.includes(v) ? v : "tutti";
  return fileResponse(await exportCsv(vista), `lead-${vista}-${dataItalia(new Date())}.csv`, "text/csv");
}
