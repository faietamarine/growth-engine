import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Copy, Trash2, Megaphone, FileDown, Workflow, TriangleAlert, PanelsTopLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { getLeadMagnet } from "@/features/lead-magnets/service";
import { LmView } from "@/features/lead-magnets/lm-view";
import { LmIcon } from "@/features/lead-magnets/lm-icon";
import { allowedTransitions, funnelEditable } from "@/lib/campaigns/status";
import { getLmTipo } from "@/lib/leadmagnets/catalog";
import { getTemplate } from "@/lib/funnels/templates";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { WORK_STATUS_UI } from "@/lib/labels";
import { cambiaStatoLm, duplicaLm, eliminaLm, spuntaChecklist } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = /^[0-9a-f-]{36}$/i.test(id) ? await getLeadMagnet(id) : null;
  return { title: d?.lm.title ?? "Lead magnet" };
}

export default async function LmPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; errore?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await getLeadMagnet(id);
  if (!d) notFound();
  const { lm, campaign } = d;
  const sp = await searchParams;
  const t = getLmTipo(lm.type);
  const funnel = t ? getTemplate(t.funnel) : null;
  const scrivi = can(user.role, "contenuti:scrivi");
  const modificabile = funnelEditable(lm.status);

  return (
    <>
      <Link href="/lead-magnet" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Lead magnet
      </Link>
      <Flash msg={sp.msg} />
      {sp.errore && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-md bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
          <TriangleAlert size={16} /> {sp.errore.slice(0, 200)}
        </p>
      )}
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={WORK_STATUS_UI[lm.status].tone}>{WORK_STATUS_UI[lm.status].label}</Badge>
          {t && (
            <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
              <span className="text-gold">
                <LmIcon icona={t.icona} size={15} />
              </span>
              {t.nome}
            </span>
          )}
          {lm.content.generatoDa === "anthropic" && <Badge tone="aqua">Testi AI</Badge>}
        </div>
        <h1 className="mt-2 font-display text-[22px] font-semibold leading-tight lg:text-[26px]">{lm.title}</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {campaign ? (
            <Link href={`/campagne/${campaign.id}`} className="inline-flex items-center gap-1.5 font-semibold text-navy hover:underline">
              <Megaphone size={14} /> {campaign.name}
            </Link>
          ) : (
            <span className="text-ink-faint">Nessuna campagna</span>
          )}
          {funnel && (
            <Link href={`/funnel/modelli/${funnel.key}${campaign ? `?campagna=${campaign.id}` : ""}`} className="inline-flex items-center gap-1.5 font-semibold text-navy hover:underline">
              <Workflow size={14} /> Funnel adatto: {funnel.nome}
            </Link>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {allowedTransitions(lm.status, user.role, "contenuto").map((tr) => (
            <form key={tr.to} action={cambiaStatoLm}>
              <input type="hidden" name="id" value={lm.id} />
              <input type="hidden" name="to" value={tr.to} />
              <SubmitButton className={tr.primaria ? "btn-primary" : "btn-ghost"} confirm={tr.conferma}>
                {tr.label}
              </SubmitButton>
            </form>
          ))}
          {scrivi && modificabile && (
            <Link href={`/lead-magnet/${lm.id}/modifica`} className="btn-ghost">
              <Pencil size={15} /> Modifica
            </Link>
          )}
          {scrivi && (
            <a href={`/api/lead-magnet/${lm.id}/export`} className="btn-ghost">
              <FileDown size={15} /> Scarica i testi
            </a>
          )}
          {scrivi && (
            <Link href={`/landing/nuova?magnet=${lm.id}${campaign ? `&campagna=${campaign.id}` : ""}`} className="btn-ghost">
              <PanelsTopLeft size={15} /> Crea la landing
            </Link>
          )}
          {scrivi && (
            <form action={duplicaLm}>
              <input type="hidden" name="id" value={lm.id} />
              <SubmitButton className="btn-ghost">
                <Copy size={15} /> {modificabile ? "Duplica" : "Nuova versione"}
              </SubmitButton>
            </form>
          )}
          {scrivi && lm.status === "BOZZA" && (
            <form action={eliminaLm}>
              <input type="hidden" name="id" value={lm.id} />
              <SubmitButton className="btn-ghost text-danger" confirm="Eliminare definitivamente questa bozza?">
                <Trash2 size={15} /> Elimina
              </SubmitButton>
            </form>
          )}
        </div>
        {lm.status === "APPROVATO" && <p className="mt-2 text-[12.5px] text-ink-faint">Se lo modifichi, torna in revisione. Per pubblicarlo serve la checklist completa.</p>}
      </header>

      <LmView c={lm.content} onToggle={scrivi && lm.status !== "CONCLUSO" ? spuntaChecklist.bind(null, lm.id) : undefined} />
    </>
  );
}
