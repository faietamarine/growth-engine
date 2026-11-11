import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns, leads } from "@/db/schema";
import { MARCHI, type Marchio } from "@/lib/brands/catalog";

const LEAD_BUONI = ["QUALIFICATO", "CONSEGNATO"];

/** Numeri per il riquadro di ogni marchio in Dashboard: campagne attive e lead del mese. */
export async function riepilogoMarchi() {
  const inizioMese = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [cs, ls] = await Promise.all([
    db.select({ id: campaigns.id, brand: campaigns.brand, status: campaigns.status }).from(campaigns),
    db.select({ campaignId: leads.campaignId, status: leads.status, createdAt: leads.createdAt }).from(leads),
  ]);
  const brandDi = new Map(cs.map((c) => [c.id, c.brand]));
  return MARCHI.map((m) => {
    const sue = cs.filter((c) => c.brand === m.slug);
    const lsM = ls.filter((l) => l.campaignId && brandDi.get(l.campaignId) === m.slug && l.createdAt >= inizioMese);
    return {
      marchio: m,
      campagneAttive: sue.filter((c) => c.status === "PUBBLICATO").length,
      campagneTotali: sue.length,
      leadMese: lsM.length,
      leadQualMese: lsM.filter((l) => LEAD_BUONI.includes(l.status)).length,
    };
  });
}

/** Campagne di un marchio, con il numero di lead raccolti. */
export async function campagneDelMarchio(m: Marchio) {
  const [rows, perCampagna] = await Promise.all([
    db.select().from(campaigns).where(eq(campaigns.brand, m.slug)).orderBy(desc(campaigns.updatedAt)),
    db
      .select({ id: leads.campaignId, tot: sql<number>`count(*)`, qual: sql<number>`sum(case when ${leads.status} in ('QUALIFICATO','CONSEGNATO') then 1 else 0 end)` })
      .from(leads)
      .groupBy(leads.campaignId),
  ]);
  const mappa = new Map(perCampagna.map((x) => [x.id, x]));
  return rows.map((c) => ({ ...c, leadTot: Number(mappa.get(c.id)?.tot ?? 0), leadQual: Number(mappa.get(c.id)?.qual ?? 0) }));
}
