import { Target, Workflow, FormInput, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import type { FormField, FunnelEmail, FunnelStep, FunnelWhatsapp } from "@/db/schema";
import { anteprimaTesto } from "@/lib/funnels/templates";
import { TIPO_FUNNEL } from "@/features/campaigns/plan-view";

export type FunnelLike = {
  obiettivo: string;
  pubblico: string;
  promessa: string;
  leadMagnet: string;
  cta: string;
  steps: FunnelStep[];
  form: FormField[];
  emails: FunnelEmail[];
  whatsapp: FunnelWhatsapp[];
  qualificazione: string[];
  conversioneAttesa?: string;
};

function Card({ id, icon: Icon, title, children, className = "" }: { id: string; icon: typeof Target; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`} aria-labelledby={id}>
      <div className="card-head">
        <h2 id={id} className="card-title flex items-center gap-2">
          <Icon size={16} className="text-gold" strokeWidth={1.9} /> {title}
        </h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

/** Anteprima del form come lo vedrà il cliente (non interattiva). */
function FormPreview({ campi, cta }: { campi: FormField[]; cta: string }) {
  return (
    <div className="mx-auto max-w-sm rounded-lg border border-line bg-bg/60 p-4" aria-label="Anteprima del form">
      <div className="space-y-3">
        {campi.map((c) => (
          <div key={c.nome}>
            <span className="mb-1 block text-[12.5px] font-semibold text-ink-soft">
              {c.etichetta}
              {c.obbligatorio && <span className="text-danger"> *</span>}
            </span>
            {c.tipo === "scelta" ? (
              <div className="flex flex-wrap gap-1.5">
                {(c.opzioni ?? []).map((o) => (
                  <span key={o} className="rounded-full border border-line-strong bg-surface px-2.5 py-1 text-[12px]">
                    {o}
                  </span>
                ))}
              </div>
            ) : (
              <div className={`rounded-md border border-line-strong bg-surface ${c.tipo === "area" ? "h-14" : "h-9"}`} />
            )}
          </div>
        ))}
        <div className="space-y-1.5 pt-1 text-[11.5px] text-ink-soft">
          <p>☐ Ho letto l&apos;informativa privacy e acconsento al trattamento dei dati per rispondere alla richiesta <span className="text-danger">*</span></p>
          <p>☐ Acconsento a ricevere offerte e novità da Faieta Marine (facoltativo)</p>
        </div>
        <div className="rounded-md bg-navy px-3 py-2.5 text-center text-[13.5px] font-semibold text-white">{cta}</div>
      </div>
    </div>
  );
}

export function FunnelView({ f }: { f: FunnelLike }) {
  return (
    <div className="space-y-4">
      <Card id="f-sintesi" icon={Target} title="Sintesi">
        <dl className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Promessa</dt>
            <dd className="mt-0.5 font-display text-[17px] font-semibold leading-snug">{f.promessa}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Obiettivo</dt>
            <dd className="mt-0.5 text-[13.5px]">{f.obiettivo}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Pubblico</dt>
            <dd className="mt-0.5 text-[13.5px]">{f.pubblico}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Lead magnet</dt>
            <dd className="mt-0.5 text-[13.5px]">{f.leadMagnet}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Invito all&apos;azione</dt>
            <dd className="mt-1">
              <span className="inline-block rounded-md bg-navy px-3 py-1.5 text-[13px] font-semibold text-white">{f.cta}</span>
              {f.conversioneAttesa && <span className="ml-2 text-[12.5px] text-ink-soft">Conversione tipica: {f.conversioneAttesa}</span>}
            </dd>
          </div>
        </dl>
      </Card>

      <Card id="f-pagine" icon={Workflow} title="Sequenza delle pagine">
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          {f.steps.map((s) => (
            <li key={s.ordine} className="rounded-md border border-line p-3">
              <div className="flex items-center gap-2">
                <span className="num flex h-5 w-5 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white">{s.ordine}</span>
                <span className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">{TIPO_FUNNEL[s.tipo] ?? s.tipo}</span>
              </div>
              <p className="mt-1.5 text-[13.5px] font-semibold">{s.titolo}</p>
              {s.descrizione && <p className="text-[12.5px] text-ink-soft">{s.descrizione}</p>}
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card id="f-form" icon={FormInput} title={`Form · ${f.form.length} campi`}>
          <FormPreview campi={f.form} cta={f.cta} />
        </Card>
        <div className="space-y-4">
          <Card id="f-email" icon={Mail} title={`Email di follow-up · ${f.emails.length}`}>
            {f.emails.length === 0 ? (
              <p className="text-[13px] text-ink-faint">Nessuna email.</p>
            ) : (
              <ol className="space-y-3">
                {f.emails.map((e, i) => (
                  <li key={i} className="border-l-2 border-gold pl-3">
                    <p className="num text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">{e.giorno === 0 ? "Subito" : `Dopo ${e.giorno} giorni`}</p>
                    <p className="text-[13.5px] font-semibold">{anteprimaTesto(e.oggetto)}</p>
                    <p className="mt-0.5 text-[13px] text-ink-soft">{anteprimaTesto(e.testo)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card id="f-wa" icon={MessageCircle} title={`Messaggi WhatsApp · ${f.whatsapp.length}`}>
            {f.whatsapp.length === 0 ? (
              <p className="text-[13px] text-ink-faint">Nessun messaggio.</p>
            ) : (
              <ul className="space-y-3">
                {f.whatsapp.map((w, i) => (
                  <li key={i}>
                    <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">{w.momento}</p>
                    <p className="max-w-[92%] rounded-lg rounded-tl-none bg-ok/10 px-3 py-2 text-[13px]">{anteprimaTesto(w.testo)}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11.5px] text-ink-faint">Anteprima con nomi di esempio. I messaggi promozionali vanno solo a chi ha dato il consenso marketing.</p>
          </Card>
          <Card id="f-qual" icon={ShieldCheck} title="Lead qualificato se…">
            <ul className="space-y-1.5 text-[13.5px]">
              {f.qualificazione.map((q, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                  {q}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
