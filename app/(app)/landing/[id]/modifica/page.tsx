import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { landingPages } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { LandingEditor } from "./editor";

export const metadata = { title: "Editor landing" };
export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("contenuti:scrivi");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const l = await db.query.landingPages.findFirst({ where: eq(landingPages.id, id) });
  if (!l) notFound();
  if (l.status === "CONCLUSO") redirect(`/landing/${id}?msg=${encodeURIComponent("La pagina è conclusa: non si modifica più.")}`);
  return (
    <>
      <h1 className="mb-3 font-display text-[20px] font-semibold">Editor: {l.title}</h1>
      <LandingEditor id={l.id} titoloIniziale={l.title} slugIniziale={l.slug} slugBloccato={l.version > 0} iniziali={l.blocks} stato={l.status} />
    </>
  );
}
