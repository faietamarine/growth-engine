"use client";

import { useActionState } from "react";
import { Loader2, Save, CheckCircle2, TriangleAlert } from "lucide-react";
import type { SiteSettings } from "@/types/landing";
import { salvaImpostazioni, type SettingsState } from "./actions";

function Campo({ name, label, hint, def, type = "text", max = 200 }: { name: keyof SiteSettings; label: string; hint?: string; def: string; type?: string; max?: number }) {
  return (
    <label className="block">
      <span className="label">
        {label} {hint && <span className="font-normal text-ink-faint">{hint}</span>}
      </span>
      <input name={name} type={type} defaultValue={def} maxLength={max} className="input" />
    </label>
  );
}

export function SettingsForm({ s }: { s: SiteSettings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(salvaImpostazioni, undefined);
  return (
    <form action={action} className="space-y-4">
      <section className="card grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:grid-cols-2">
        <h2 className="card-title md:col-span-2">Dati dell&apos;azienda (piè di pagina delle landing e informativa)</h2>
        <Campo name="ragioneSociale" label="Ragione sociale" def={s.ragioneSociale} />
        <Campo name="nomeCommerciale" label="Nome commerciale" def={s.nomeCommerciale} />
        <Campo name="indirizzo" label="Indirizzo" def={s.indirizzo} />
        <Campo name="partitaIva" label="Partita IVA" def={s.partitaIva} max={20} />
        <Campo name="emailPrivacy" label="Email per la privacy" type="email" def={s.emailPrivacy} hint="obbligatoria per legge nell'informativa" />
        <Campo name="telefono" label="Telefono" def={s.telefono} hint="compare in alto nelle landing" max={30} />
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="card-title">Informativa privacy</h2>
        <p className="rounded-md bg-warn/10 px-3 py-2 text-[13px] text-warn">
          Il testo iniziale è una bozza: fatelo verificare dal vostro consulente privacy prima di pubblicare le landing. Segnaposto: {"{ragioneSociale}"}, {"{indirizzo}"}, {"{emailPrivacy}"}, {"{nomeCommerciale}"}.
        </p>
        <textarea name="informativa" defaultValue={s.informativa} className="input min-h-[320px] py-2 font-mono text-[12.5px] leading-relaxed" maxLength={12000} />
        <label className="block max-w-xs">
          <span className="label">Versione</span>
          <input name="versioneInformativa" defaultValue={s.versioneInformativa} className="input" maxLength={40} />
        </label>
        <p className="text-[12px] text-ink-faint">Ogni lead registra la versione accettata. Se cambi il testo senza cambiare la versione, ne viene creata una nuova con la data di oggi.</p>
      </section>

      <section className="card grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:grid-cols-3">
        <h2 className="card-title md:col-span-3">Misurazione e pubblicità</h2>
        <Campo name="metaPixelId" label="ID Pixel Meta" def={s.metaPixelId} hint="solo cifre" max={20} />
        <Campo name="ga4Id" label="ID Google Analytics 4" def={s.ga4Id} hint="G-…" max={20} />
        <Campo name="gtmId" label="ID Google Tag Manager" def={s.gtmId} hint="GTM-…" max={20} />
        <p className="text-[12px] text-ink-faint md:col-span-3">Si attivano solo dopo che il visitatore accetta nel banner dei cookie. Se lasci tutto vuoto, il banner non compare.</p>
      </section>

      <div className="sticky bottom-20 z-20 lg:bottom-4">
        <div className="card flex flex-wrap items-center gap-3 p-3 shadow-pop">
          {state && (
            <p role="status" className={`flex items-center gap-1.5 text-[13px] font-medium ${state.ok ? "text-ok" : "text-danger"}`}>
              {state.ok ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />} {state.msg}
            </p>
          )}
          <button type="submit" className="btn-primary ml-auto" disabled={pending}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salva
          </button>
        </div>
      </div>
    </form>
  );
}
