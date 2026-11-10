import "server-only";
import { db } from "@/db/client";
import { campaigns, leads, tasks, users, assets, type Channel, type Campaign, type Task } from "@/db/schema";
import { dataItalia } from "@/lib/crm/nautilus";

/** Un lead conta come "qualificato" se è in coda verso il CRM o già consegnato. */
const QUALIFICATI = new Set(["QUALIFICATO", "CONSEGNATO"]);

export type CampaignRow = Campaign & { leadTot: number; leadQual: number; cpl: number | null };
export type TaskRow = Task & { assigneeName: string | null; campaignName: string | null; inRitardo: boolean };

export async function getDashboard(now = new Date()) {
  const [allCampaigns, allLeads, allTasks, allUsers, allAssets] = await Promise.all([
    db.select().from(campaigns),
    db.select({ status: leads.status, campaignId: leads.campaignId, channel: leads.channel, createdAt: leads.createdAt, deliveredAt: leads.deliveredAt }).from(leads),
    db.select().from(tasks),
    db.select({ id: users.id, name: users.name }).from(users),
    db.select({ status: assets.status }).from(assets),
  ]);

  const oggi = dataItalia(now);
  const mese = oggi.slice(0, 7);
  const nelMese = (d: Date | null) => !!d && dataItalia(d).slice(0, 7) === mese;

  const leadMese = allLeads.filter((l) => nelMese(l.createdAt));
  const kpi = {
    campagneAttive: allCampaigns.filter((c) => c.status === "PUBBLICATO").length,
    campagneInRevisione: allCampaigns.filter((c) => c.status === "REVISIONE").length,
    leadMese: leadMese.length,
    leadQualMese: leadMese.filter((l) => QUALIFICATI.has(l.status)).length,
    inCoda: allLeads.filter((l) => l.status === "QUALIFICATO").length,
    consegnatiMese: allLeads.filter((l) => l.status === "CONSEGNATO" && nelMese(l.deliveredAt)).length,
    assetInRevisione: allAssets.filter((a) => a.status === "REVISIONE").length,
  };

  // Campagne in corso o in preparazione, con lead e costo per lead qualificato.
  const campagne: CampaignRow[] = allCampaigns
    .filter((c) => c.status !== "CONCLUSO")
    .map((c) => {
      const ls = allLeads.filter((l) => l.campaignId === c.id);
      const leadQual = ls.filter((l) => QUALIFICATI.has(l.status)).length;
      return { ...c, leadTot: ls.length, leadQual, cpl: leadQual > 0 ? c.spent / leadQual : null };
    })
    .sort((a, b) => ORDINE_STATO[a.status] - ORDINE_STATO[b.status] || (a.startDate ?? "").localeCompare(b.startDate ?? ""));

  const nomeUtente = new Map(allUsers.map((u) => [u.id, u.name]));
  const nomeCampagna = new Map(allCampaigns.map((c) => [c.id, c.name]));
  const fra7 = dataItalia(new Date(now.getTime() + 7 * 86400000));
  const produzione: TaskRow[] = allTasks
    .filter((t) => t.status !== "FATTO" && t.dueDate <= fra7)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((t) => ({
      ...t,
      assigneeName: t.assigneeId ? (nomeUtente.get(t.assigneeId) ?? null) : null,
      campaignName: t.campaignId ? (nomeCampagna.get(t.campaignId) ?? null) : null,
      inRitardo: t.dueDate < oggi,
    }));

  // Lead degli ultimi 30 giorni per canale.
  const da30 = now.getTime() - 30 * 86400000;
  const perCanale = new Map<Channel, number>();
  for (const l of allLeads) if (l.createdAt.getTime() >= da30) perCanale.set(l.channel, (perCanale.get(l.channel) ?? 0) + 1);
  const canali = [...perCanale.entries()].map(([canale, n]) => ({ canale, n })).sort((a, b) => b.n - a.n);

  return { oggi, kpi, campagne, produzione, canali, ritardi: produzione.filter((t) => t.inRitardo).length };
}

const ORDINE_STATO: Record<Campaign["status"], number> = { PUBBLICATO: 0, REVISIONE: 1, APPROVATO: 2, BOZZA: 3, PAUSA: 4, CONCLUSO: 5 };
