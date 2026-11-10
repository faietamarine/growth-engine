import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { landingPages } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getSiteSettings } from "@/features/settings/service";
import { PreviewClient } from "./preview-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anteprima" };

export default async function AnteprimaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ versione?: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.id, id) });
  if (!l) notFound();
  const s = await getSiteSettings();
  const online = (await searchParams).versione === "online" && l.publishedBlocks;
  return (
    <PreviewClient
      iniziali={online ? l.publishedBlocks! : l.blocks}
      titolo={l.title}
      reparto={l.reparto}
      footer={{ nomeCommerciale: s.nomeCommerciale, ragioneSociale: s.ragioneSociale, indirizzo: s.indirizzo, partitaIva: s.partitaIva, telefono: s.telefono }}
    />
  );
}
