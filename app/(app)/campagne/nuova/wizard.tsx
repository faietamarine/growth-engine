"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Sparkles, Loader2, ArrowLeft, RefreshCw, Save, Wand2 } from "lucide-react";
import { generaPiano, salvaBozza, type GenerateState } from "../actions";
import { PlanView } from "@/features/campaigns/plan-view";
import { Badge } from "@/components/ui/badge";
import { REPARTO_UI, euro } from "@/lib/labels";
import { formatIt } from "@/lib/campaigns/generate";

const ESEMPI = [
  "Generare richieste di prova in mare per barche a vela usate",
  "Acquisire lead per noleggio estivo di gommoni senza patente",
  "Recuperare proprietari di barche per manutenzione primaverile",
  "Promuovere l'open day in marina di aprile",
  "Generare richieste di valutazione per permuta",
];

const DURATE = [30, 45, 60, 90, 120];

type Form = { obiettivo: string; reparto: string; dataInizio: string; durataGiorni: string; budget: string; leadTarget: string; dettagli: string };

export function Wizard({ defaultStart }: { defaultStart: string }) {
  const [f, setF] = useState<Form>({ obiettivo: "", reparto: "AUTO", dataInizio: defaultStart, durataGiorni: "60", budget: "", leadTarget: "", dettagli: "" });
  const [res, setRes] = useState<GenerateState | null>(null);
  const [nome, setNome] = useState("");
  const [errSalva, setErrSalva] = useState<string | null>(null);
  const [generando, startGen] = useTransition();
  const [salvando, startSave] = useTransition();
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const campi = res && !res.ok ? (res.campi ?? {}) : {};
  const piano = res && res.ok ? res : null;

  function genera() {
    setErrSalva(null);
    startGen(async () => {
      const r = await generaPiano(f);
      setRes(r);
      if (r.ok) {
        setNome(r.campaign.name);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  function salva() {
    if (!piano) return;
    setErrSalva(null);
    startSave(async () => {
      const c = piano.campaign;
      const r = await salvaBozza({ name: nome, objective: c.objective, reparto: c.reparto, startDate: c.startDate, endDate: c.endDate, budget: c.budget, leadTarget: c.leadTarget, utmBase: c.utmBase, plan: c.plan });
      if (r && !r.ok) setErrSalva(r.errore);
    });
  }

  if (piano) {
    const c = piano.campaign;
    const leadTot = c.plan.canali.reduce((t, x) => t + x.leadStimati, 0);
    return (
      <div>
        <div className="card mb-4 p-4">
          <label htmlFor="nome" className="label">
            Nome della campagna
          </label>
          <input id="nome" className="input text-[15px] font-semibold" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
            <Badge tone={REPARTO_UI[c.reparto].tone}>Lead a Nautilus EVO: {REPARTO_UI[c.reparto].label}</Badge>
            <span className="num">
              {formatIt(c.startDate)} → {formatIt(c.endDate)}
            </span>
            <span>·</span>
            <span className="num">Budget {euro(c.budget)}</span>
            <span>·</span>
            <span className="num">
              {leadTot} lead stimati, obiettivo {c.leadTarget} qualificati
            </span>
            <Badge tone={piano.provider === "anthropic" ? "aqua" : "neutral"}>{piano.provider === "anthropic" ? "Testi scritti con l'AI" : "Testi dal modello nautico"}</Badge>
          </div>
          {piano.nota && <p className="mt-2 text-[12.5px] text-warn">{piano.nota}</p>}
        </div>

        <PlanView plan={c.plan} budget={c.budget} leadTarget={c.leadTarget} />

        <div className="sticky bottom-20 z-20 mt-4 lg:bottom-4">
          <div className="card flex flex-wrap items-center gap-2 p-3 shadow-pop">
            <button type="button" className="btn-ghost" onClick={() => setRes(null)} disabled={salvando}>
              <ArrowLeft size={16} /> Modifica l&apos;obiettivo
            </button>
            <button type="button" className="btn-ghost" onClick={genera} disabled={generando || salvando}>
              {generando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Rigenera
            </button>
            <div className="ml-auto flex flex-col items-end gap-1">
              <button type="button" className="btn-primary" onClick={salva} disabled={salvando || nome.trim().length < 5}>
                {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salva come bozza
              </button>
              {errSalva && (
                <p role="alert" className="text-[12.5px] font-medium text-danger">
                  {errSalva}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const err = (k: string) =>
    campi[k] ? (
      <p id={`e-${k}`} className="mt-1 text-[12.5px] font-medium text-danger">
        {campi[k]}
      </p>
    ) : null;

  return (
    <form
      className="card mx-auto max-w-3xl p-5"
      onSubmit={(e) => {
        e.preventDefault();
        genera();
      }}
      noValidate
    >
      <label htmlFor="obiettivo" className="label">
        Obiettivo commerciale
      </label>
      <textarea
        id="obiettivo"
        rows={3}
        className={clsx("input min-h-[84px] py-2", campi.obiettivo && "border-danger")}
        placeholder="Es. Generare richieste di prova in mare per gommoni Joker Boat a maggio"
        value={f.obiettivo}
        onChange={set("obiettivo")}
        aria-invalid={!!campi.obiettivo}
        aria-describedby={campi.obiettivo ? "e-obiettivo" : undefined}
        maxLength={400}
      />
      {err("obiettivo")}
      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Esempi">
        {ESEMPI.map((e) => (
          <button key={e} type="button" onClick={() => setF((x) => ({ ...x, obiettivo: e }))} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12.5px] text-ink-soft hover:border-navy hover:text-navy">
            {e}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dataInizio" className="label">
            Partenza
          </label>
          <input id="dataInizio" type="date" className="input" value={f.dataInizio} onChange={set("dataInizio")} />
          {err("dataInizio")}
        </div>
        <div>
          <label htmlFor="durata" className="label">
            Durata
          </label>
          <select id="durata" className="input" value={f.durataGiorni} onChange={set("durataGiorni")}>
            {DURATE.map((d) => (
              <option key={d} value={d}>
                {d} giorni
              </option>
            ))}
          </select>
          {err("durataGiorni")}
        </div>
        <div>
          <label htmlFor="budget" className="label">
            Budget pubblicitario (€) <span className="font-normal text-ink-faint">facoltativo</span>
          </label>
          <input id="budget" type="number" inputMode="numeric" min={0} step={1} className="input" placeholder="Lascia vuoto: lo propongo io" value={f.budget} onChange={set("budget")} />
          {err("budget")}
        </div>
        <div>
          <label htmlFor="leadTarget" className="label">
            Obiettivo lead qualificati <span className="font-normal text-ink-faint">facoltativo</span>
          </label>
          <input id="leadTarget" type="number" inputMode="numeric" min={1} className="input" placeholder="Lascia vuoto: lo stimo io" value={f.leadTarget} onChange={set("leadTarget")} />
          {err("leadTarget")}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reparto" className="label">
            Dove arrivano i lead in Nautilus EVO
          </label>
          <select id="reparto" className="input" value={f.reparto} onChange={set("reparto")}>
            <option value="AUTO">Automatico (dall&apos;obiettivo)</option>
            <option value="VENDITA">Lead Vendita</option>
            <option value="SERVICE">Lead Service</option>
            <option value="NOLEGGIO">Noleggio (nei Lead Vendita)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="dettagli" className="label">
            Dettagli utili <span className="font-normal text-ink-faint">facoltativo: modelli, promozioni, vincoli</span>
          </label>
          <textarea id="dettagli" rows={2} className="input min-h-[64px] py-2" placeholder="Es. 3 Joker Clubman 22 in pronta consegna, prove dal porto di Pescara" value={f.dettagli} onChange={set("dettagli")} maxLength={600} />
        </div>
      </div>

      {res && !res.ok && (
        <p role="alert" className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
          {res.errore}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p className="hidden items-center gap-1.5 text-[12.5px] text-ink-faint sm:flex">
          <Wand2 size={14} /> Il piano non viene salvato finché non lo confermi.
        </p>
        <button type="submit" className="btn-primary" disabled={generando}>
          {generando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generando ? "Preparo il piano…" : "Genera il piano"}
        </button>
      </div>
    </form>
  );
}
