import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, Save, Trash2, Copy, ExternalLink, TriangleAlert, Sparkles, Megaphone } from "lucide-react";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { getAsset } from "@/features/assets/service";
import { campaignOptions } from "@/features/funnels/service";
import { AssetFields } from "@/features/assets/asset-fields";
import { transizioniAsset } from "@/lib/assets/catalog";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { CopyButton } from "@/components/ui/copy-button";
import { ASSET_STATUS_UI, dataBreve } from "@/lib/labels";
import { eliminaAsset, nuovaVersione, salvaAsset, statoAsset } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = /^[0-9a-f-]{36}$/i.test(id) ? await getAsset(id) : null;
  return { title: a?.title ?? "Asset" };
}

export default async function AssetDettaglio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; errore?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const a = await getAsset(id);
  if (!a) notFound();
  const sp = await searchParams;
  const scrivi = can(user.role, "contenuti:scrivi");
  const [campagne, utenti] = await Promise.all([campaignOptions(), db.select({ id: users.id, name: users.name }).from(users).where(eq(users.active, true))]);
  const opz = a.campaignId && !campagne.some((c) => c.id === a.campaignId) ? [...campagne, { id: a.campaignId, name: a.campaignName ?? "Campagna conclusa", status: "CONCLUSO" as const }] : campagne;

  return (
    <>
      <Link href="/asset" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Asset
      </Link>
      <Flash msg={sp.msg} />
      {sp.errore && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-md bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
          <TriangleAlert size={16} /> {sp.errore.slice(0, 200)}
        </p>
      )}
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ASSET_STATUS_UI[a.status].tone}>{ASSET_STATUS_UI[a.status].label}</Badge>
          <span className="text-[12.5px] font-semibold text-gold">{a.type}</span>
          <Badge tone="neutral">Versione {a.version}</Badge>
        </div>
        <h1 className="mt-2 font-display text-[22px] font-semibold leading-tight lg:text-[26px]">{a.title}</h1>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-soft">
          {a.campaignName && a.campaignId && (
            <Link href={`/campagne/${a.campaignId}`} className="inline-flex items-center gap-1.5 font-semibold text-navy hover:underline">
              <Megaphone size={14} /> {a.campaignName}
            </Link>
          )}
          {a.authorName && <span>Autore: {a.authorName}</span>}
          {a.dueDate && <span className="num">Scadenza: {dataBreve(a.dueDate)}</span>}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {transizioniAsset(a.status, user.role).map((t) => (
            <form key={t.to} action={statoAsset}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="to" value={t.to} />
              <SubmitButton className={t.primaria ? "btn-primary" : "btn-ghost"}>{t.label}</SubmitButton>
            </form>
          ))}
          {a.fileUrl && (
            <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              <ExternalLink size={15} /> Apri il file
            </a>
          )}
          {scrivi && (
            <form action={nuovaVersione}>
              <input type="hidden" name="id" value={a.id} />
              <SubmitButton className="btn-ghost" title="Copia in bozza con versione successiva">
                <Copy size={15} /> Nuova versione
              </SubmitButton>
            </form>
          )}
          {scrivi && (a.status === "IDEA" || a.status === "BOZZA" || a.status === "REVISIONE") && (
            <form action={eliminaAsset}>
              <input type="hidden" name="id" value={a.id} />
              <SubmitButton className="btn-ghost text-danger" confirm="Eliminare questo asset?">
                <Trash2 size={15} /> Elimina
              </SubmitButton>
            </form>
          )}
        </div>
        {a.status === "REVISIONE" && !can(user.role, "campagne:approva") && <p className="mt-2 text-[12.5px] text-ink-faint">In attesa di approvazione da marketing o direzione.</p>}
      </header>

      {a.aiPrompt && (
        <section className="card mb-4">
          <div className="card-head">
            <h2 className="card-title inline-flex items-center gap-2">
              <Sparkles size={15} className="text-gold" /> Prompt AI
            </h2>
            <CopyButton text={a.aiPrompt} />
          </div>
          <p className="whitespace-pre-line p-4 text-[13px]">{a.aiPrompt}</p>
        </section>
      )}

      {scrivi && a.status !== "PUBBLICATO" ? (
        <ActionForm action={salvaAsset.bind(null, a.id)} submit="Salva" icon={<Save size={16} />}>
          <AssetFields a={a} campagne={opz} utenti={utenti} />
        </ActionForm>
      ) : (
        a.notes && (
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Testo e note</h2>
              <CopyButton text={a.notes} />
            </div>
            <p className="whitespace-pre-line p-4 text-[13px]">{a.notes}</p>
          </section>
        )
      )}
    </>
  );
}
