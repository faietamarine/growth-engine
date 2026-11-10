import { TriangleAlert, Target, Users, MessageSquareQuote, Workflow, Wallet, CalendarDays, ClipboardList, ShieldCheck } from "lucide-react";
import type { CampaignPlan } from "@/types/campaign";
import { Badge } from "@/components/ui/badge";
import { CHANNEL_LABEL, dataBreve, euro } from "@/lib/labels";

/* Vista del piano di campagna: usata nell'anteprima del wizard e nella scheda campagna.
   Nessuno stato interno: si può rendere sia lato server sia lato client. */

const TIPO_CAL = {
  preparazione: { label: "Preparazione", tone: "neutral" },
  lancio: { label: "Lancio", tone: "gold" },
  contenuto: { label: "Contenuto", tone: "info" },
  controllo: { label: "Controllo", tone: "aqua" },
  chiusura: { label: "Chiusura", tone: "ok" },
} as const;

export const TIPO_FUNNEL: Record<string, string> = { LANDING: "Landing", FORM: "Form", QUIZ: "Quiz", CALCOLATORE: "Calcolatore", GRAZIE: "Grazie", EMAIL: "Email", WHATSAPP: "WhatsApp" };

function Section({ id, icon: Icon, title, children, extra }: { id: string; icon: typeof Target; title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="card" aria-labelledby={id}>
      <div className="card-head">
        <h2 id={id} className="card-title flex items-center gap-2">
          <Icon size={16} className="text-gold" strokeWidth={1.9} />
          {title}
        </h2>
        {extra}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Lista({ voci }: { voci: string[] }) {
  return (
    <ul className="space-y-1.5 text-[13.5px]">
      {voci.map((v, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
          <span>{v}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlanView({ plan, budget, leadTarget, calendarAction }: { plan: CampaignPlan; budget: number; leadTarget: number; calendarAction?: React.ReactNode }) {
  const leadTot = plan.canali.reduce((t, c) => t + c.leadStimati, 0);
  const totQuota = plan.canali.reduce((t, c) => t + c.quota, 0);
  const totBudget = plan.canali.reduce((t, c) => t + c.budget, 0);
  const kpi = plan.kpi.map((k) => (k.nome === "Lead qualificati (obiettivo)" ? { ...k, target: leadTarget } : k));

  return (
    <div className="space-y-4">
      {plan.avvertenze.length > 0 && (
        <section className="rounded-lg border border-warn/30 bg-warn/[.06] px-4 py-3" aria-label="Avvertenze">
          <p className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-warn">
            <TriangleAlert size={15} /> Da tenere presente
          </p>
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-ink">
            {plan.avvertenze.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      <Section id="p-strategia" icon={Target} title="Strategia">
        <dl className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Promessa principale</dt>
            <dd className="mt-0.5 font-display text-[17px] font-semibold leading-snug">{plan.promessa}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Angolo</dt>
            <dd className="mt-0.5 text-[13.5px]">{plan.angolo}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Offerta magnetica</dt>
            <dd className="mt-0.5 text-[13.5px]">{plan.offerta}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Invito all&apos;azione</dt>
            <dd className="mt-1">
              <span className="inline-block rounded-md bg-navy px-3 py-1.5 text-[13px] font-semibold text-white">{plan.cta}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">KPI</dt>
            <dd className="mt-1">
              <ul className="num space-y-0.5 text-[13.5px]">
                {kpi.map((k) => (
                  <li key={k.nome} className="flex justify-between gap-3">
                    <span className="text-ink-soft">{k.nome}</span>
                    <b>{k.unita === "€" ? euro(k.target) : k.target}</b>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </Section>

      <Section id="p-pubblico" icon={Users} title="Pubblico e segmenti">
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
          {plan.audience.map((a) => (
            <li key={a.nome} className="rounded-md border border-line p-3">
              <p className="text-[13.5px] font-semibold">{a.nome}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">{a.descrizione}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="p-messaggi" icon={MessageSquareQuote} title="Messaggi">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-3">
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Hook</h3>
            <Lista voci={plan.hook} />
          </div>
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Problemi (pain point)</h3>
            <Lista voci={plan.painPoint} />
          </div>
          <div>
            <h3 className="mb-2 text-[13px] font-semibold text-ink-soft">Desideri</h3>
            <Lista voci={plan.desideri} />
          </div>
        </div>
        <h3 className="mb-2 mt-5 text-[13px] font-semibold text-ink-soft">Obiezioni e risposte</h3>
        <ul className="divide-y divide-line rounded-md border border-line">
          {plan.obiezioni.map((o, i) => (
            <li key={i} className="grid grid-cols-[minmax(0,1fr)] gap-1 px-3 py-2 text-[13.5px] md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-4">
              <span className="font-semibold">«{o.obiezione}»</span>
              <span className="text-ink-soft">{o.risposta}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="p-funnel" icon={Workflow} title="Funnel e form">
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          {plan.funnel.map((f) => (
            <li key={f.ordine} className="rounded-md border border-line p-3">
              <div className="flex items-center gap-2">
                <span className="num flex h-5 w-5 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">{f.ordine}</span>
                <span className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">{TIPO_FUNNEL[f.tipo] ?? f.tipo}</span>
              </div>
              <p className="mt-1.5 text-[13.5px] font-semibold">{f.titolo}</p>
              <p className="text-[12.5px] text-ink-soft">{f.descrizione}</p>
            </li>
          ))}
        </ol>
        <h3 className="mb-2 mt-4 text-[13px] font-semibold text-ink-soft">Campi del form</h3>
        <ul className="flex flex-wrap gap-1.5">
          {plan.formFields.map((f) => (
            <li key={f.nome} className="rounded-full border border-line px-2.5 py-1 text-[12.5px]">
              {f.etichetta}
              {f.obbligatorio && <span className="text-danger" aria-label="obbligatorio"> *</span>}
            </li>
          ))}
          <li className="rounded-full border border-line bg-hover px-2.5 py-1 text-[12.5px]">
            Consenso privacy<span className="text-danger"> *</span> · consenso marketing
          </li>
        </ul>
      </Section>

      <Section id="p-canali" icon={Wallet} title="Canali e budget">
        <div className="-mx-4 overflow-x-auto">
          <table className="num w-full min-w-[620px] text-left text-[13px]">
            <thead className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
              <tr className="border-b border-line">
                <th className="px-4 py-2">Canale</th>
                <th className="px-2 py-2 text-right">Quota</th>
                <th className="px-2 py-2 text-right">Budget</th>
                <th className="px-2 py-2 text-right">Costo/lead stimato</th>
                <th className="px-2 py-2 text-right">Lead stimati</th>
                <th className="px-4 py-2">Perché</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {plan.canali.map((c) => (
                <tr key={c.canale}>
                  <td className="whitespace-nowrap px-4 py-2 font-semibold">{CHANNEL_LABEL[c.canale]}</td>
                  <td className="px-2 py-2 text-right">{c.quota > 0 ? `${c.quota}%` : "—"}</td>
                  <td className="px-2 py-2 text-right">{c.budget > 0 ? euro(c.budget) : "—"}</td>
                  <td className="px-2 py-2 text-right">{c.cplStimato > 0 ? euro(c.cplStimato) : "senza spesa"}</td>
                  <td className="px-2 py-2 text-right">{c.leadStimati}</td>
                  <td className="px-4 py-2 text-[12.5px] text-ink-soft">{c.perche}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line font-semibold">
                <td className="px-4 py-2">Totale</td>
                <td className="px-2 py-2 text-right">{totQuota}%</td>
                <td className="px-2 py-2 text-right">{euro(totBudget)}</td>
                <td className="px-2 py-2 text-right">{leadTot > 0 ? euro(Math.round(budget / leadTot)) : "—"}</td>
                <td className="px-2 py-2 text-right">{leadTot}</td>
                <td className="px-4 py-2" />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-ink-faint">Costi per lead di riferimento prudenziali; il totale del costo per lead è calcolato su tutti i lead stimati, anche quelli senza spesa.</p>
      </Section>

      <Section id="p-calendario" icon={CalendarDays} title="Calendario di lancio" extra={calendarAction}>
        <ol className="divide-y divide-line">
          {plan.calendario.map((c, i) => (
            <li key={i} className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3 py-2 md:grid-cols-[72px_44px_minmax(0,1fr)_auto]">
              <span className="num pt-0.5 text-[12.5px] font-semibold">{dataBreve(c.data)}</span>
              <span className="num hidden pt-0.5 text-[12px] text-ink-faint md:block">{c.giorno > 0 ? `+${c.giorno}` : c.giorno === 0 ? "G0" : c.giorno}</span>
              <span className="text-[13.5px]">
                {c.attivita}
                {c.canale && <span className="text-ink-faint"> · {CHANNEL_LABEL[c.canale]}</span>}
              </span>
              <span className="col-start-2 md:col-start-auto">
                <Badge tone={TIPO_CAL[c.tipo].tone}>{TIPO_CAL[c.tipo].label}</Badge>
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
        <Section id="p-asset" icon={ClipboardList} title="Asset da produrre">
          <Lista voci={plan.asset} />
        </Section>
        <Section id="p-metriche" icon={Target} title="Metriche da monitorare">
          <Lista voci={plan.metriche} />
        </Section>
        <Section id="p-qual" icon={ShieldCheck} title="Lead qualificato se…">
          <Lista voci={plan.qualificazione} />
        </Section>
      </div>
    </div>
  );
}
