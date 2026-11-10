import "server-only";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { assets, campaigns, users, type AssetStatus, type User } from "@/db/schema";
import { audit } from "@/lib/audit";
import { effettoModifica, puoPassare, type AssetInput } from "@/lib/assets/catalog";

export type FiltriAsset = { tipo?: string; stato?: string; campagna?: string };

export async function listAssets(f: FiltriAsset) {
  const where: SQL[] = [];
  if (f.tipo) where.push(eq(assets.type, f.tipo));
  if (f.stato) where.push(eq(assets.status, f.stato as AssetStatus));
  if (f.campagna) where.push(eq(assets.campaignId, f.campagna));
  const rows = await db
    .select({ a: assets, campaignName: campaigns.name, authorName: users.name })
    .from(assets)
    .leftJoin(campaigns, eq(assets.campaignId, campaigns.id))
    .leftJoin(users, eq(assets.authorId, users.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(assets.dueDate), desc(assets.updatedAt));
  return rows.map((r) => ({ ...r.a, campaignName: r.campaignName, authorName: r.authorName }));
}
export type AssetItem = Awaited<ReturnType<typeof listAssets>>[number];

export async function getAsset(id: string) {
  const r = await db
    .select({ a: assets, campaignName: campaigns.name, authorName: users.name })
    .from(assets)
    .leftJoin(campaigns, eq(assets.campaignId, campaigns.id))
    .leftJoin(users, eq(assets.authorId, users.id))
    .where(eq(assets.id, id));
  return r[0] ? { ...r[0].a, campaignName: r[0].campaignName, authorName: r[0].authorName } : null;
}

export async function createAsset(input: AssetInput, user: User) {
  const [row] = await db
    .insert(assets)
    .values({ ...input, authorId: input.authorId ?? user.id, status: "IDEA", version: 1 })
    .returning({ id: assets.id });
  await audit(user, "asset_creato", "asset", row.id, `${input.type}: ${input.title}`);
  return row.id;
}

export async function updateAsset(id: string, input: AssetInput, user: User) {
  const a = await db.query.assets.findFirst({ where: eq(assets.id, id) });
  if (!a) throw new Error("Asset non trovato.");
  if (a.status === "PUBBLICATO") throw new Error("L'asset è pubblicato: per cambiarlo crea una nuova versione.");
  const eff = effettoModifica(a, input.fileUrl);
  await db.update(assets).set({ ...input, authorId: input.authorId ?? a.authorId, version: eff.version, status: eff.status }).where(eq(assets.id, id));
  await audit(user, "asset_modificato", "asset", id, `v${eff.version} ${input.title}`);
  return eff.messaggio;
}

export async function changeAssetStatus(id: string, to: AssetStatus, user: User) {
  const a = await db.query.assets.findFirst({ where: eq(assets.id, id) });
  if (!a) throw new Error("Asset non trovato.");
  if (!puoPassare(a.status, to, user.role)) throw new Error("Passaggio di stato non consentito.");
  if ((to === "REVISIONE" || to === "APPROVATO" || to === "PUBBLICATO") && !a.fileUrl && !a.notes.trim())
    throw new Error("Aggiungi il link al file o il testo nelle note prima di mandarlo avanti.");
  await db.update(assets).set({ status: to }).where(eq(assets.id, id));
  await audit(user, "asset_stato", "asset", id, `${a.status} → ${to}`);
}

/** Nuova versione di un asset pubblicato (o copia di lavoro): stesso contenuto, versione +1, in bozza. */
export async function newVersion(id: string, user: User) {
  const a = await db.query.assets.findFirst({ where: eq(assets.id, id) });
  if (!a) throw new Error("Asset non trovato.");
  const [row] = await db
    .insert(assets)
    .values({ title: a.title, type: a.type, campaignId: a.campaignId, status: "BOZZA", version: a.version + 1, authorId: user.id, dueDate: a.dueDate, notes: a.notes, aiPrompt: a.aiPrompt, fileUrl: a.fileUrl })
    .returning({ id: assets.id });
  await audit(user, "asset_versione", "asset", row.id, `v${a.version + 1} da ${id}`);
  return row.id;
}

export async function deleteAsset(id: string, user: User) {
  const a = await db.query.assets.findFirst({ where: eq(assets.id, id) });
  if (!a) throw new Error("Asset non trovato.");
  if (a.status === "PUBBLICATO" || a.status === "APPROVATO") throw new Error("Un asset approvato o pubblicato resta nello storico.");
  await db.delete(assets).where(eq(assets.id, id));
  await audit(user, "asset_eliminato", "asset", id, a.title);
}
