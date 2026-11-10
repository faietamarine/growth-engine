import "server-only";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { campaigns, funnels, landingPages, leadMagnets, leads, type User, type WorkStatus } from "@/db/schema";
import { audit } from "@/lib/audit";
import { canTransition } from "@/lib/campaigns/status";
import { slugify } from "@/lib/campaigns/generate";
import { bloccoIniziali, blocchiSchema, problemiPubblicazione } from "@/lib/landing/blocks";
import { WORK_STATUS_UI } from "@/lib/labels";
import type { AbTest, Blocco } from "@/types/landing";

export async function uniqueSlug(base: string, excludeId?: string) {
  const b = slugify(base, 50) || "pagina";
  const rows = await db.select({ id: landingPages.id, slug: landingPages.slug }).from(landingPages).where(like(landingPages.slug, `${b}%`));
  const usati = new Set(rows.filter((r) => r.id !== excludeId).map((r) => r.slug));
  if (!usati.has(b) && b !== "privacy") return b;
  for (let i = 2; ; i++) if (!usati.has(`${b}-${i}`)) return `${b}-${i}`;
}

export async function listLandings() {
  const rows = await db
    .select({ l: landingPages, campaignName: campaigns.name })
    .from(landingPages)
    .leftJoin(campaigns, eq(landingPages.campaignId, campaigns.id))
    .orderBy(desc(landingPages.updatedAt));
  const conteggi = await db.select({ id: leads.landingPageId, n: sql<number>`count(*)` }).from(leads).groupBy(leads.landingPageId);
  const m = new Map(conteggi.map((c) => [c.id, Number(c.n)]));
  return rows.map((r) => ({ ...r.l, campaignName: r.campaignName, leadCount: m.get(r.l.id) ?? 0 }));
}

export async function getLanding(id: string) {
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.id, id) });
  if (!l) return null;
  const [camp, fun, lm, perVariante] = await Promise.all([
    l.campaignId ? db.query.campaigns.findFirst({ where: eq(campaigns.id, l.campaignId), columns: { id: true, name: true, utmCampaign: true, plan: true } }) : null,
    l.funnelId ? db.query.funnels.findFirst({ where: eq(funnels.id, l.funnelId), columns: { id: true, name: true } }) : null,
    l.leadMagnetId ? db.query.leadMagnets.findFirst({ where: eq(leadMagnets.id, l.leadMagnetId), columns: { id: true, title: true } }) : null,
    db
      .select({ v: leads.variant, n: sql<number>`count(*)`, q: sql<number>`sum(case when ${leads.status} in ('QUALIFICATO','CONSEGNATO') then 1 else 0 end)` })
      .from(leads)
      .where(eq(leads.landingPageId, id))
      .groupBy(leads.variant),
  ]);
  const lead = (v: "A" | "B") => perVariante.filter((x) => (v === "A" ? x.v !== "B" : x.v === "B")).reduce((t, x) => t + Number(x.n), 0);
  const qual = perVariante.reduce((t, x) => t + Number(x.q ?? 0), 0);
  return { landing: l, campaign: camp ?? null, funnel: fun ?? null, leadMagnet: lm ?? null, stats: { leadA: lead("A"), leadB: lead("B"), qualificati: qual } };
}

/** Crea una landing partendo da funnel, lead magnet e/o campagna (almeno il titolo). */
export async function createLanding(input: { title: string; funnelId: string | null; leadMagnetId: string | null; campaignId: string | null }, user: User) {
  const [f, lm, c0] = await Promise.all([
    input.funnelId ? db.query.funnels.findFirst({ where: eq(funnels.id, input.funnelId) }) : null,
    input.leadMagnetId ? db.query.leadMagnets.findFirst({ where: eq(leadMagnets.id, input.leadMagnetId) }) : null,
    input.campaignId ? db.query.campaigns.findFirst({ where: eq(campaigns.id, input.campaignId) }) : null,
  ]);
  if (input.funnelId && !f) throw new Error("Funnel non trovato.");
  if (input.leadMagnetId && !lm) throw new Error("Lead magnet non trovato.");
  // La campagna si ricava anche dal funnel o dal lead magnet collegati.
  const campaignId = c0?.id ?? f?.campaignId ?? lm?.campaignId ?? null;
  const c = c0 ?? (campaignId ? await db.query.campaigns.findFirst({ where: eq(campaigns.id, campaignId) }) : null);
  const blocks = bloccoIniziali({
    titolo: input.title,
    funnel: f ? { promise: f.promise, cta: f.cta, formFields: f.formFields, steps: f.steps, leadMagnet: f.leadMagnet } : null,
    leadMagnet: lm?.content ?? null,
    campagna: c ? { promessa: c.plan.promessa, cta: c.plan.cta, offerta: c.plan.offerta, hook: c.plan.hook } : null,
  });
  const [row] = await db
    .insert(landingPages)
    .values({
      slug: await uniqueSlug(input.title),
      title: input.title,
      campaignId,
      funnelId: f?.id ?? null,
      leadMagnetId: lm?.id ?? null,
      reparto: f?.reparto ?? c?.reparto ?? "VENDITA",
      status: "BOZZA",
      blocks,
      ownerId: user.id,
    })
    .returning({ id: landingPages.id });
  await audit(user, "landing_creata", "landing", row.id, input.title);
  return row.id;
}

export async function saveDraft(id: string, input: { title: string; slug: string; blocks: Blocco[] }, user: User) {
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.id, id) });
  if (!l) throw new Error("Pagina non trovata.");
  if (l.status === "CONCLUSO") throw new Error("La pagina è conclusa: non si modifica più.");
  const blocks = blocchiSchema.parse(input.blocks);
  let slug = l.slug;
  if (input.slug !== l.slug) {
    // L'indirizzo si cambia solo finché la pagina non è mai stata online: altrimenti i link già condivisi smetterebbero di funzionare.
    if (l.version > 0) throw new Error("L'indirizzo non si cambia dopo la prima pubblicazione: i link già condivisi non funzionerebbero più.");
    slug = await uniqueSlug(input.slug, id);
  }
  const torna = l.status === "APPROVATO";
  await db
    .update(landingPages)
    .set({ title: input.title, slug, blocks, ...(torna ? { status: "REVISIONE" as const } : {}) })
    .where(eq(landingPages.id, id));
  await audit(user, "landing_bozza", "landing", id, input.title);
  return { slug, msg: torna ? "Bozza salvata. Era approvata: è tornata in revisione." : l.status === "PUBBLICATO" ? "Bozza salvata. Online resta la versione pubblicata finché non pubblichi le modifiche." : "Bozza salvata." };
}

/** Mette online la bozza attuale (prima pubblicazione o aggiornamento). */
async function pubblica(id: string, user: User) {
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.id, id) });
  if (!l) throw new Error("Pagina non trovata.");
  const problemi = problemiPubblicazione(l.blocks);
  if (problemi.length) throw new Error(`Prima di pubblicare: ${problemi.join(" ")}`);
  await db.update(landingPages).set({ publishedBlocks: l.blocks, status: "PUBBLICATO", version: l.version + 1, publishedAt: new Date() }).where(eq(landingPages.id, id));
  await audit(user, "landing_pubblicata", "landing", id, `versione ${l.version + 1}`);
}

export async function changeLandingStatus(id: string, to: WorkStatus, user: User) {
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.id, id) });
  if (!l) throw new Error("Pagina non trovata.");
  if (!canTransition(l.status, to, user.role, "landing")) throw new Error(`Passaggio non consentito: da ${WORK_STATUS_UI[l.status].label} a ${WORK_STATUS_UI[to].label}.`);
  if (to === "PUBBLICATO" && l.status === "APPROVATO") return pubblica(id, user);
  await db.update(landingPages).set({ status: to }).where(eq(landingPages.id, id));
  await audit(user, "landing_stato", "landing", id, `${WORK_STATUS_UI[l.status].label} → ${WORK_STATUS_UI[to].label}`);
}

/** Pagina già online: pubblica le modifiche della bozza (serve il permesso di pubblicare). */
export async function republish(id: string, user: User) {
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.id, id) });
  if (!l) throw new Error("Pagina non trovata.");
  if (l.status !== "PUBBLICATO" && l.status !== "PAUSA") throw new Error("La pagina non è ancora stata pubblicata.");
  if (JSON.stringify(l.blocks) === JSON.stringify(l.publishedBlocks)) throw new Error("Non ci sono modifiche da pubblicare.");
  const problemi = problemiPubblicazione(l.blocks);
  if (problemi.length) throw new Error(`Prima di pubblicare: ${problemi.join(" ")}`);
  await db.update(landingPages).set({ publishedBlocks: l.blocks, version: l.version + 1, publishedAt: new Date() }).where(eq(landingPages.id, id));
  await audit(user, "landing_ripubblicata", "landing", id, `versione ${l.version + 1}`);
}

export async function setAbTest(id: string, ab: AbTest | null, user: User) {
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.id, id) });
  if (!l) throw new Error("Pagina non trovata.");
  // Avviare un test azzera i contatori delle visite: i confronti partono alla pari.
  const avvio = !!ab?.attivo && !l.abTest?.attivo;
  await db
    .update(landingPages)
    .set({ abTest: ab, ...(avvio ? { visits: 0, visitsB: 0 } : {}) })
    .where(eq(landingPages.id, id));
  await audit(user, ab?.attivo ? "ab_avviato" : "ab_fermato", "landing", id, ab ? `${ab.elemento}: ${ab.valoreB}` : "");
}

/** Applica la variante B alla bozza (e, se la pagina è online, la ripubblica) e chiude il test. */
export async function applyWinnerB(id: string, user: User) {
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.id, id) });
  if (!l?.abTest) throw new Error("Nessun test in corso.");
  const { applicaVariante } = await import("@/lib/landing/ab");
  const blocks = applicaVariante(l.blocks, { ...l.abTest, attivo: true }, "B");
  const online = l.status === "PUBBLICATO";
  await db
    .update(landingPages)
    .set({ blocks, abTest: null, ...(online ? { publishedBlocks: blocks, version: l.version + 1, publishedAt: new Date() } : {}) })
    .where(eq(landingPages.id, id));
  await audit(user, "ab_applicata_b", "landing", id, `${l.abTest.elemento}: ${l.abTest.valoreB}`);
}

export async function deleteLanding(id: string, user: User) {
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.id, id) });
  if (!l) throw new Error("Pagina non trovata.");
  if (l.version > 0) throw new Error("Una pagina già stata online non si elimina: si conclude, così i lead restano collegati.");
  await db.delete(landingPages).where(eq(landingPages.id, id));
  await audit(user, "landing_eliminata", "landing", id, l.title);
}

// ---------------------------------------------------------------------------
// Parte pubblica

export async function getPublicLanding(slug: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.slug, slug) });
  if (!l || !l.publishedBlocks) return null;
  const camp = l.campaignId ? await db.query.campaigns.findFirst({ where: eq(campaigns.id, l.campaignId), columns: { utmCampaign: true } }) : null;
  return { landing: l, campaignUtm: camp?.utmCampaign ?? "" };
}

export async function trackVisit(slug: string, variante: "A" | "B") {
  const res = await db
    .update(landingPages)
    .set(variante === "B" ? { visitsB: sql`${landingPages.visitsB} + 1` } : { visits: sql`${landingPages.visits} + 1` })
    .where(and(eq(landingPages.slug, slug), eq(landingPages.status, "PUBBLICATO")));
  return res.rowsAffected > 0;
}
