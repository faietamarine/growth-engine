import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Copy, Trash2, CalendarPlus, Link2, Send, ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { getCampaign } from "@/features/campaigns/service";
import { PlanView } from "@/features/campaigns/plan-view";
import { allowedTransitions, editScope } from "@/lib/campaigns/status";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { CHANNEL_LABEL, REPARTO_UI, WORK_STATUS_UI, euro } from "@/lib/labels";
import { formatIt } from "@/lib/campaigns/generate";
import { cambiaStato, creaAttivita, duplica, elimina } from "../actions";
import { UtmLinks } from "./utm-links";
import { listFunnels } from "@/features/funnels/service";
import { TEMPLATE_PER_SCENARIO, getTemplate } from "@/lib/funnels/templates";
import { creaConsigliato } from "../../funnel/actions";
import { Workflow, Plus, Magnet } from "lucide-react";
import { listLeadMagnets } from "@/features/lead-magnets/service";
import { LM_PER_SCENARIO, getLmTipo } from "@/lib/leadmagnets/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const d = await getCampaign((await params).id).catch(() => null);
  return { title: d?.campaign.name ?? "Campagna" };
}

const DESTINAZIONE = {
  VENDITA: "Lead Vendita · stato Qualificato · Marco",
  NOLEGGIO: "Lead Vendita con interesse «Noleggio» · Marco",
  SERVICE: "Lead Service · Richiesta ricevuta · Daniele",
} as const;

export default async function CampagnaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; nuova?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await getCampaign(id);
  if (!d) notFound();
  const sp = await searchParams;
  const { campaign: c, leads: l } = d;
  const scrivi = can(user.role, "campagne:scrivi");
  const transizioni = allowedTransitions(c.status, user.role);
  const scope = editScope(c.status);
  const base = `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/l/${c.utmCampaign}`;
  const canaliUtm = [...new Set(c.plan.canali.map((x) => x.canale))];
  const funnelCollegati = await listFunnels({ campaignId: c.id });
  const consigliato = getTemplate(TEMPLATE_PER_SCENARIO[c.plan.scenario] ?? "consulenza");
  const creaFunnel = can(user.role, "funnel:scrivi") && c.status !== "CONCLUSO";
  const magnetCollegati = await listLeadMagnets({ campaignId: c.id });
  const lmConsigliato = getLmTipo(LM_PER_SCENARIO[c.plan.scenario] ?? "consulenza");
  const creaLm = can(user.role, "contenuti:scrivi") && c.status !== "CONCLUSO";

  return (
    <>
      <Link href="/campagne" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Campagne
      </Link>
      <Flash msg={sp.nuova ? "Campagna salvata in bozza. Rivedila e inviala in revisione quando è pronta." : sp.msg} />

      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={WORK_STATUS_UI[c.status].tone}>{WORK_STATUS_UI[c.status].label}</Badge>
          <Badge tone={REPARTO_UI[c.reparto].tone}>{REPARTO_UI[c.reparto].label}</Badge>
          {c.plan.generatoDa === "anthropic" && <Badge tone="aqua">Testi AI</Badge>}
        </div>
        <h1 className="mt-2 font-display text-[22px] font-semibold leading-tight lg:text-[26px]">{c.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">{c.objective}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {transizioni.map((t) => (
            <form key={t.to} action={cambiaStato}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="to" value={t.to} />
              <SubmitButton className={t.primaria ? "btn-primary" : "btn-ghost"} confirm={t.conferma}>
                {t.label}
              </SubmitButton>
            </form>
          ))}
          {scrivi && (
            <Link href={`/campagne/${c.id}/modifica`} className="btn-ghost">
              <Pencil size={15} /> {scope === "tutto" ? "Modifica" : scope === "operativo" ? "Aggiorna spesa e obiettivi" : "Aggiorna spesa"}
            </Link>
          )}
          {scrivi && (
            <form action={duplica}>
              <input type="hidden" name="id" value={c.id} />
              <SubmitButton className="btn-ghost" title="Crea una copia in bozza">
                <Copy size={15} /> Duplica
              </SubmitButton>
            </form>
          )}
          {can(user.role, "impostazioni:gestisci") && c.status === "BOZZA" && l.tot === 0 && (
            <form action={elimina}>
              <input type="hidden" name="id" value={c.id} />
              <SubmitButton className="btn-ghost text-danger" confirm="Eliminare definitivamente questa bozza?">
                <Trash2 size={15} /> Elimina
              </SubmitButton>
            </form>
          )}
        </div>
        {c.status === "APPROVATO" && <p className="mt-2 text-[12.5px] text-ink-faint">Se modifichi la strategia, la campagna torna in revisione.</p>}
      </header>

      <section className="mb-4 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3" aria-label="Risultati">
        <div className="card p-4">
          <p className="text-[12.5px] font-semibold text-ink-soft">Lead qualificati</p>
          <p className="num mt-1 font-display text-[24px] font-semibold">
            {l.qual} <span className="text-[15px] text-ink-faint">/ {c.leadTarget}</span>
          </p>
          <div className="mt-2">
            <Progress value={l.qual} max={c.leadTarget} label="Lead qualificati sull'obiettivo" />
          </div>
          <p className="num mt-1.5 text-[12.5px] text-ink-soft">
            {l.tot} ricevuti · {l.consegnati} consegnati al CRM
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[12.5px] font-semibold text-ink-soft">Spesa</p>
          <p className="num mt-1 font-display text-[24px] font-semibold">
            {euro(c.spent)} <span className="text-[15px] text-ink-faint">/ {euro(c.budget)}</span>
          </p>
          <div className="mt-2">
            <Progress value={c.spent} max={c.budget} label="Spesa sul budget" />
          </div>
          <p className="num mt-1.5 text-[12.5px] text-ink-soft">
            Costo per lead qualificato: {l.cpl !== null ? euro(l.cpl) : "—"}
            {c.leadTarget > 0 && ` (stimato ${euro(Math.round(c.budget / c.leadTarget))})`}
          </p>
        </div>
        <div className="card p-4 text-[13px]">
          <p className="text-[12.5px] font-semibold text-ink-soft">Dettagli</p>
          <dl className="mt-1 space-y-1">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Periodo</dt>
              <dd className="num font-medium">
                {c.startDate ? formatIt(c.startDate) : "—"} → {c.endDate ? formatIt(c.endDate) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Responsabile</dt>
              <dd className="font-medium">{d.ownerName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Codice UTM</dt>
              <dd className="min-w-0 truncate font-mono text-[12px]">{c.utmCampaign}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="flex items-center gap-1 text-ink-soft">
                <Send size={12} /> CRM
              </dt>
              <dd className="text-right font-medium">{DESTINAZIONE[c.reparto]}</dd>
            </div>
          </dl>
          {l.perCanale.size > 0 && (
            <p className="mt-2 text-[12px] text-ink-faint">
              Lead per canale:{" "}
              {[...l.perCanale.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([k, n]) => `${CHANNEL_LABEL[k]} ${n}`)
                .join(" · ")}
            </p>
          )}
        </div>
      </section>

      <section className="card mb-4" aria-labelledby="t-utm">
        <div className="card-head">
          <h2 id="t-utm" className="card-title flex items-center gap-2">
            <Link2 size={16} className="text-gold" /> Link tracciati per canale
          </h2>
        </div>
        <div className="px-4 py-2">
          <UtmLinks base={base} utm={c.utmCampaign} canali={canaliUtm} />
          <p className="pb-2 pt-1 text-[12px] text-ink-faint">L&apos;indirizzo della landing diventa attivo con il Blocco 5; i parametri UTM valgono già per qualsiasi pagina.</p>
        </div>
      </section>

      <section className="card mb-4" aria-labelledby="t-funnel">
        <div className="card-head">
          <h2 id="t-funnel" className="card-title flex items-center gap-2">
            <Workflow size={16} className="text-gold" /> Funnel della campagna
          </h2>
          {creaFunnel && funnelCollegati.length > 0 && (
            <Link href="/funnel" className="text-[13px] font-semibold text-navy hover:underline">
              Aggiungi da libreria
            </Link>
          )}
        </div>
        {funnelCollegati.length > 0 ? (
          <ul className="divide-y divide-line">
            {funnelCollegati.map((f) => (
              <li key={f.id}>
                <Link href={`/funnel/${f.id}`} className="flex flex-wrap items-center gap-2 px-4 py-2.5 hover:bg-hover/60">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{f.name}</span>
                  <Badge tone={WORK_STATUS_UI[f.status].tone}>{WORK_STATUS_UI[f.status].label}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <p className="min-w-0 flex-1 text-[13.5px] text-ink-soft">
              Nessun funnel collegato.{consigliato && <> Per questa campagna il modello consigliato è <b className="text-ink">«{consigliato.nome}»</b>.</>}
            </p>
            {creaFunnel && consigliato && (
              <div className="flex flex-wrap gap-2">
                <Link href={`/funnel/modelli/${consigliato.key}?campagna=${c.id}`} className="btn-ghost btn-sm">
                  Vedi il modello
                </Link>
                <form action={creaConsigliato}>
                  <input type="hidden" name="campaignId" value={c.id} />
                  <input type="hidden" name="key" value={consigliato.key} />
                  <input type="hidden" name="name" value={`${consigliato.nome} — ${c.name}`.slice(0, 120)} />
                  <SubmitButton className="btn-primary btn-sm">
                    <Plus size={14} /> Crea il funnel consigliato
                  </SubmitButton>
                </form>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card mb-4" aria-labelledby="t-lm">
        <div className="card-head">
          <h2 id="t-lm" className="card-title flex items-center gap-2">
            <Magnet size={16} className="text-gold" /> Lead magnet
          </h2>
          {creaLm && (
            <Link href={`/lead-magnet/nuovo?campagna=${c.id}${lmConsigliato ? `&tipo=${lmConsigliato.key}` : ""}`} className="text-[13px] font-semibold text-navy hover:underline">
              {magnetCollegati.length ? "Aggiungi" : `Crea: ${lmConsigliato?.nome ?? "lead magnet"}`}
            </Link>
          )}
        </div>
        {magnetCollegati.length > 0 ? (
          <ul className="divide-y divide-line">
            {magnetCollegati.map((m) => (
              <li key={m.id}>
                <Link href={`/lead-magnet/${m.id}`} className="flex flex-wrap items-center gap-2 px-4 py-2.5 hover:bg-hover/60">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{m.title}</span>
                  <span className="num text-[12px] text-ink-faint">
                    checklist {m.content.checklist.filter((x) => x.fatto).length}/{m.content.checklist.length}
                  </span>
                  <Badge tone={WORK_STATUS_UI[m.status].tone}>{WORK_STATUS_UI[m.status].label}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-3 text-[13.5px] text-ink-soft">Nessun lead magnet collegato.{lmConsigliato && <> Per questa campagna è consigliato: <b className="text-ink">{lmConsigliato.nome}</b>.</>}</p>
        )}
      </section>

      <PlanView
        plan={c.plan}
        budget={c.budget}
        leadTarget={c.leadTarget}
        calendarAction={
          scrivi && !c.plan.attivitaCreate && c.status !== "CONCLUSO" ? (
            <form action={creaAttivita}>
              <input type="hidden" name="id" value={c.id} />
              <SubmitButton className="btn-ghost btn-sm" confirm={`Creare ${c.plan.calendario.length} attività nel calendario di produzione?`}>
                <CalendarPlus size={14} /> Crea le attività
              </SubmitButton>
            </form>
          ) : c.plan.attivitaCreate ? (
            <Badge tone="ok">{d.tasks.length} attività create</Badge>
          ) : undefined
        }
      />
    </>
  );
}
