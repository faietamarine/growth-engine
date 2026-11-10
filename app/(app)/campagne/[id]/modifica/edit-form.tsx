"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Save, CheckCircle2, TriangleAlert } from "lucide-react";
import { salvaModifiche, type EditState } from "../../actions";
import type { Campaign } from "@/db/schema";
import type { EditScope } from "@/lib/campaigns/status";

function Campo({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {hint && <span className="font-normal text-ink-faint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

const area = "input min-h-[88px] py-2 leading-relaxed";

export function EditForm({ c, scope }: { c: Campaign; scope: EditScope }) {
  const [state, action, pending] = useActionState<EditState, FormData>(salvaModifiche, undefined);
  const p = c.plan;
  const tutto = scope === "tutto";
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={c.id} />

      <section className="card space-y-4 p-4" aria-label="Dati della campagna">
        {tutto && (
          <>
            <Campo id="name" label="Nome">
              <input id="name" name="name" className="input" defaultValue={c.name} required minLength={5} maxLength={120} />
            </Campo>
            <Campo id="objective" label="Obiettivo">
              <textarea id="objective" name="objective" className={area} defaultValue={c.objective} maxLength={400} />
            </Campo>
          </>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tutto && (
            <>
              <Campo id="reparto" label="Lead in Nautilus EVO">
                <select id="reparto" name="reparto" className="input" defaultValue={c.reparto}>
                  <option value="VENDITA">Lead Vendita</option>
                  <option value="SERVICE">Lead Service</option>
                  <option value="NOLEGGIO">Noleggio (nei Lead Vendita)</option>
                </select>
              </Campo>
              <Campo id="startDate" label="Inizio">
                <input id="startDate" name="startDate" type="date" className="input" defaultValue={c.startDate ?? ""} required />
              </Campo>
            </>
          )}
          {scope !== "spesa" && (
            <Campo id="endDate" label="Fine">
              <input id="endDate" name="endDate" type="date" className="input" defaultValue={c.endDate ?? ""} required />
            </Campo>
          )}
          {tutto && (
            <Campo id="budget" label="Budget (€)" hint="ricalcola i canali">
              <input id="budget" name="budget" type="number" min={0} step={1} className="input" defaultValue={c.budget} />
            </Campo>
          )}
          {scope !== "spesa" && (
            <Campo id="leadTarget" label="Obiettivo lead qualificati">
              <input id="leadTarget" name="leadTarget" type="number" min={0} className="input" defaultValue={c.leadTarget} />
            </Campo>
          )}
          <Campo id="spent" label="Spesa sostenuta (€)" hint="dai report di Meta e Google">
            <input id="spent" name="spent" type="number" min={0} step={1} className="input" defaultValue={c.spent} />
          </Campo>
        </div>
        {tutto && <p className="text-[12.5px] text-ink-faint">Se cambi budget o date e lasci invariato l&apos;obiettivo lead, l&apos;obiettivo viene ricalcolato con le nuove stime.</p>}
      </section>

      {tutto && (
        <section className="card space-y-4 p-4" aria-label="Strategia e testi">
          <h2 className="card-title">Strategia e testi</h2>
          <Campo id="promessa" label="Promessa principale">
            <textarea id="promessa" name="promessa" className={area} defaultValue={p.promessa} maxLength={400} />
          </Campo>
          <div className="grid gap-4 md:grid-cols-2">
            <Campo id="angolo" label="Angolo">
              <textarea id="angolo" name="angolo" className={area} defaultValue={p.angolo} maxLength={500} />
            </Campo>
            <Campo id="offerta" label="Offerta magnetica">
              <textarea id="offerta" name="offerta" className={area} defaultValue={p.offerta} maxLength={400} />
            </Campo>
          </div>
          <Campo id="cta" label="Invito all'azione">
            <input id="cta" name="cta" className="input" defaultValue={p.cta} maxLength={80} />
          </Campo>
          <Campo id="audience" label="Pubblico" hint="una riga per segmento · Nome: descrizione">
            <textarea id="audience" name="audience" className={area} defaultValue={p.audience.map((a) => `${a.nome}: ${a.descrizione}`).join("\n")} />
          </Campo>
          <div className="grid gap-4 md:grid-cols-3">
            <Campo id="hook" label="Hook" hint="uno per riga">
              <textarea id="hook" name="hook" className={area} defaultValue={p.hook.join("\n")} />
            </Campo>
            <Campo id="painPoint" label="Pain point" hint="uno per riga">
              <textarea id="painPoint" name="painPoint" className={area} defaultValue={p.painPoint.join("\n")} />
            </Campo>
            <Campo id="desideri" label="Desideri" hint="uno per riga">
              <textarea id="desideri" name="desideri" className={area} defaultValue={p.desideri.join("\n")} />
            </Campo>
          </div>
          <Campo id="obiezioni" label="Obiezioni" hint="una per riga · obiezione | risposta">
            <textarea id="obiezioni" name="obiezioni" className={area} defaultValue={p.obiezioni.map((o) => `${o.obiezione} | ${o.risposta}`).join("\n")} />
          </Campo>
          <div className="grid gap-4 md:grid-cols-3">
            <Campo id="asset" label="Asset da produrre" hint="uno per riga">
              <textarea id="asset" name="asset" className={area} defaultValue={p.asset.join("\n")} />
            </Campo>
            <Campo id="metriche" label="Metriche" hint="una per riga">
              <textarea id="metriche" name="metriche" className={area} defaultValue={p.metriche.join("\n")} />
            </Campo>
            <Campo id="qualificazione" label="Lead qualificato se…" hint="una per riga">
              <textarea id="qualificazione" name="qualificazione" className={area} defaultValue={p.qualificazione.join("\n")} />
            </Campo>
          </div>
        </section>
      )}

      <div className="sticky bottom-20 z-20 lg:bottom-4">
        <div className="card flex flex-wrap items-center gap-3 p-3 shadow-pop">
          {state && (
            <p role="status" className={`flex items-center gap-1.5 text-[13px] font-medium ${state.ok ? "text-ok" : "text-danger"}`}>
              {state.ok ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />} {state.msg}
            </p>
          )}
          <div className="ml-auto flex gap-2">
            <Link href={`/campagne/${c.id}`} className="btn-ghost">
              Torna alla campagna
            </Link>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salva
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
