import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Copy, Trash2, Megaphone, PanelsTopLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { getFunnel } from "@/features/funnels/service";
import { FunnelView } from "@/features/funnels/funnel-view";
import { allowedTransitions, funnelEditable } from "@/lib/campaigns/status";
import { getTemplate } from "@/lib/funnels/templates";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { REPARTO_UI, WORK_STATUS_UI } from "@/lib/labels";
import { cambiaStatoFunnel, duplicaFunnel, eliminaFunnel } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = /^[0-9a-f-]{36}$/i.test(id) ? await getFunnel(id) : null;
  return { title: d?.funnel.name ?? "Funnel" };
}

export default async function FunnelDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await getFunnel(id);
  if (!d) notFound();
  const { funnel: f, campaign } = d;
  const { msg } = await searchParams;
  const scrivi = can(user.role, "funnel:scrivi");
  const modificabile = funnelEditable(f.status);
  const modello = f.templateKey ? getTemplate(f.templateKey) : null;

  return (
    <>
      <Link href="/funnel?vista=miei" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> I nostri funnel
      </Link>
      <Flash msg={msg} />
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={WORK_STATUS_UI[f.status].tone}>{WORK_STATUS_UI[f.status].label}</Badge>
          <Badge tone={REPARTO_UI[f.reparto].tone}>Lead in Nautilus EVO: {REPARTO_UI[f.reparto].label}</Badge>
          {modello && <span className="text-[12.5px] text-ink-faint">dal modello «{modello.nome}»</span>}
        </div>
        <h1 className="mt-2 font-display text-[22px] font-semibold leading-tight lg:text-[26px]">{f.name}</h1>
        {campaign ? (
          <Link href={`/campagne/${campaign.id}`} className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy hover:underline">
            <Megaphone size={14} /> {campaign.name}
          </Link>
        ) : (
          <p className="mt-1 text-[13px] text-ink-faint">Non collegato a nessuna campagna</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {allowedTransitions(f.status, user.role, "funnel").map((t) => (
            <form key={t.to} action={cambiaStatoFunnel}>
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="to" value={t.to} />
              <SubmitButton className={t.primaria ? "btn-primary" : "btn-ghost"} confirm={t.conferma}>
                {t.label}
              </SubmitButton>
            </form>
          ))}
          {scrivi && modificabile && (
            <Link href={`/funnel/${f.id}/modifica`} className="btn-ghost">
              <Pencil size={15} /> Modifica
            </Link>
          )}
          {can(user.role, "contenuti:scrivi") && (
            <Link href={`/landing/nuova?funnel=${f.id}`} className="btn-ghost">
              <PanelsTopLeft size={15} /> Crea la landing
            </Link>
          )}
          {scrivi && (
            <form action={duplicaFunnel}>
              <input type="hidden" name="id" value={f.id} />
              <SubmitButton className="btn-ghost" title={modificabile ? "Crea una copia in bozza" : "Crea una nuova versione modificabile"}>
                <Copy size={15} /> {modificabile ? "Duplica" : "Nuova versione"}
              </SubmitButton>
            </form>
          )}
          {scrivi && f.status === "BOZZA" && d.landingCount === 0 && (
            <form action={eliminaFunnel}>
              <input type="hidden" name="id" value={f.id} />
              <SubmitButton className="btn-ghost text-danger" confirm="Eliminare definitivamente questa bozza?">
                <Trash2 size={15} /> Elimina
              </SubmitButton>
            </form>
          )}
        </div>
        {f.status === "APPROVATO" && <p className="mt-2 text-[12.5px] text-ink-faint">Se lo modifichi, torna in revisione.</p>}
        {!modificabile && <p className="mt-2 text-[12.5px] text-ink-faint">Pubblicato o concluso: per cambiarlo crea una nuova versione, così i risultati restano legati a questa.</p>}
      </header>

      <FunnelView
        f={{
          obiettivo: f.objective,
          pubblico: f.audience,
          promessa: f.promise,
          leadMagnet: f.leadMagnet,
          cta: f.cta,
          steps: f.steps,
          form: f.formFields,
          emails: f.emails,
          whatsapp: f.whatsapp,
          qualificazione: f.qualificationRules,
          conversioneAttesa: modello?.conversioneAttesa,
        }}
      />
    </>
  );
}
