import { apiUser, fileResponse } from "@/lib/auth/api";
import { getReport } from "@/features/report/service";
import { toCsv } from "@/lib/csv";
import { CHANNEL_LABEL } from "@/lib/labels";

/** Report del periodo in un unico CSV a sezioni (apribile in Excel). */
export async function GET(req: Request) {
  const r = await apiUser("lead:vedi");
  if ("error" in r) return r.error;
  const rep = await getReport(new URL(req.url).searchParams.get("periodo") ?? undefined);
  const n = (x: number | null) => (x === null ? "" : String(x).replace(".", ","));
  const righe: unknown[][] = [
    ["Report", rep.periodo.etichetta, `dal ${rep.periodo.da}`, `al ${rep.periodo.a}`],
    [],
    ["RIEPILOGO"],
    ["Lead", rep.kpi.lead],
    ["Lead qualificati", rep.kpi.qualificati],
    ["% qualificati", n(rep.kpi.tassoQualifica)],
    ["Consegnati al CRM nel periodo", rep.kpi.consegnati],
    ["In coda verso il CRM (oggi)", rep.kpi.inCoda],
    ["Spesa registrata (€)", n(rep.kpi.spesa)],
    ["Costo per lead qualificato (€)", n(rep.kpi.cplQualificato)],
    [],
    ["CANALI", "Lead", "Qualificati", "% qualificati"],
    ...rep.canali.map((c) => [CHANNEL_LABEL[c.canale], c.lead, c.qualificati, n(c.tasso)]),
    [],
    ["CAMPAGNE", "Lead", "Qualificati", "Obiettivo lead", "Budget (€)", "Spesa (€)", "Costo per qualificato (€)", "Obiettivo costo (€)"],
    ...rep.campagne.map((c) => [c.nome, c.lead, c.qualificati, c.obiettivoLead, n(c.budget), n(c.spesa), n(c.cpl), n(c.cplObiettivo)]),
    [],
    ["LANDING", "Visite (totali)", "Lead (totali)", "Conversione %", "Lead nel periodo"],
    ...rep.landing.map((l) => [l.titolo, l.visite, l.lead, n(l.conversione), l.leadPeriodo]),
    [],
    ["EVENTI", "Data", "Iscritti", "Presenti", "Raccolti sul posto", "Qualificati", "Spesa (€)", "Costo per lead (€)"],
    ...rep.eventi.map((e) => [e.nome, e.data, e.iscritti, e.presenti, e.sulPosto, e.qualificati, n(e.spesa), n(e.cpl)]),
    [],
    ["PRODUZIONE", "Scadute nel periodo", "Fatte", "Puntualità %", "In ritardo oggi"],
    ["Attività", rep.produzione.scadute, rep.produzione.fatte, n(rep.produzione.puntualita), rep.produzione.inRitardo],
  ];
  const [head, ...rest] = righe;
  return fileResponse(toCsv(head.map(String), rest), `report-${rep.periodo.key}-${rep.periodo.da}.csv`, "text/csv");
}
