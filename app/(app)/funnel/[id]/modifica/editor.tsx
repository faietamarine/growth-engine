"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Trash2, Plus, Save, Loader2, CheckCircle2, TriangleAlert, Lock } from "lucide-react";
import type { FormField, Funnel, FunnelEmail, FunnelStep, FunnelWhatsapp, Reparto } from "@/db/schema";
import { FUNNEL_STEP_TIPI } from "@/lib/enums";
import { CAMPI_OBBLIGATORI } from "@/lib/funnels/templates";
import { TIPI_CAMPO, nomeCampo } from "@/lib/funnels/validation";
import { TIPO_FUNNEL } from "@/features/campaigns/plan-view";
import { salvaFunnel, type SaveFunnelState } from "../../actions";

const TIPO_CAMPO_LABEL: Record<(typeof TIPI_CAMPO)[number], string> = { testo: "Testo", email: "Email", telefono: "Telefono", scelta: "Scelta", numero: "Numero", area: "Testo lungo" };
const area = "input min-h-[72px] py-2 leading-relaxed";

function sposta<T>(a: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= a.length) return a;
  const b = [...a];
  [b[i], b[j]] = [b[j], b[i]];
  return b;
}

function Riga({ i, n, onUp, onDown, onDel, bloccata, children }: { i: number; n: number; onUp: () => void; onDown: () => void; onDel?: () => void; bloccata?: boolean; children: React.ReactNode }) {
  return (
    <li className="rounded-md border border-line p-3">
      <div className="mb-2 flex items-center gap-1">
        <span className="num mr-auto text-[12px] font-semibold text-ink-faint">#{i + 1}</span>
        <button type="button" className="btn-ghost btn-sm px-2" onClick={onUp} disabled={i === 0} aria-label="Sposta su">
          <ArrowUp size={14} />
        </button>
        <button type="button" className="btn-ghost btn-sm px-2" onClick={onDown} disabled={i === n - 1} aria-label="Sposta giù">
          <ArrowDown size={14} />
        </button>
        {bloccata ? (
          <span className="flex h-8 items-center gap-1 px-2 text-[11.5px] text-ink-faint" title="Campo necessario per il CRM">
            <Lock size={13} /> necessario
          </span>
        ) : (
          <button type="button" className="btn-ghost btn-sm px-2 text-danger" onClick={onDel} aria-label="Elimina">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {children}
    </li>
  );
}

export function FunnelEditor({ f, campagne }: { f: Funnel; campagne: { id: string; name: string }[] }) {
  const [d, setD] = useState({ name: f.name, campaignId: f.campaignId ?? "", reparto: f.reparto as Reparto, objective: f.objective, audience: f.audience, promise: f.promise, leadMagnet: f.leadMagnet, cta: f.cta, qualificazione: f.qualificationRules.join("\n") });
  const [steps, setSteps] = useState<FunnelStep[]>(f.steps);
  const [campi, setCampi] = useState<FormField[]>(f.formFields);
  const [emails, setEmails] = useState<FunnelEmail[]>(f.emails);
  const [wa, setWa] = useState<FunnelWhatsapp[]>(f.whatsapp);
  const [esito, setEsito] = useState<SaveFunnelState | null>(null);
  const [pending, start] = useTransition();
  const sd = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setD((x) => ({ ...x, [k]: e.target.value }));
  const upd = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, i: number, patch: Partial<T>) => set((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  function nuovoCampo() {
    const usati = new Set(campi.map((c) => c.nome));
    let n = "campoNuovo";
    for (let k = 2; usati.has(n); k++) n = `campoNuovo${k}`;
    setCampi((a) => [...a, { nome: n, etichetta: "", tipo: "testo", obbligatorio: false }]);
  }

  function salva() {
    setEsito(null);
    // I campi nuovi prendono il nome tecnico dall'etichetta (senza doppioni).
    const usati = new Set<string>();
    const campiFinali = campi.map((c) => {
      let nome = c.nome.startsWith("campoNuovo") && c.etichetta.trim() ? nomeCampo(c.etichetta) : c.nome;
      const base = nome;
      for (let k = 2; usati.has(nome); k++) nome = `${base}${k}`;
      usati.add(nome);
      return { ...c, nome, opzioni: c.tipo === "scelta" ? (c.opzioni ?? []).map((o) => o.trim()).filter(Boolean) : undefined };
    });
    start(async () => {
      const r = await salvaFunnel(f.id, {
        name: d.name,
        campaignId: d.campaignId || null,
        reparto: d.reparto,
        objective: d.objective,
        audience: d.audience,
        promise: d.promise,
        leadMagnet: d.leadMagnet,
        cta: d.cta,
        steps,
        formFields: campiFinali,
        emails: emails.map((e) => ({ ...e, giorno: Number(e.giorno) })),
        whatsapp: wa,
        qualificationRules: d.qualificazione.split("\n").map((x) => x.trim()).filter(Boolean),
      });
      setEsito(r);
      if (r.ok) setCampi(campiFinali);
    });
  }

  return (
    <div className="space-y-4">
      <section className="card space-y-4 p-4" aria-labelledby="e-dati">
        <h2 id="e-dati" className="card-title">
          Dati del funnel
        </h2>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="name" className="label">
              Nome
            </label>
            <input id="name" className="input" value={d.name} onChange={sd("name")} maxLength={120} />
          </div>
          <div>
            <label htmlFor="campaignId" className="label">
              Campagna
            </label>
            <select id="campaignId" className="input" value={d.campaignId} onChange={sd("campaignId")}>
              <option value="">Nessuna</option>
              {campagne.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reparto" className="label">
              Lead in Nautilus EVO
            </label>
            <select id="reparto" className="input" value={d.reparto} onChange={sd("reparto")}>
              <option value="VENDITA">Lead Vendita</option>
              <option value="SERVICE">Lead Service</option>
              <option value="NOLEGGIO">Noleggio (nei Lead Vendita)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="promise" className="label">
              Promessa
            </label>
            <textarea id="promise" className={area} value={d.promise} onChange={sd("promise")} maxLength={400} />
          </div>
          <div>
            <label htmlFor="objective" className="label">
              Obiettivo
            </label>
            <textarea id="objective" className={area} value={d.objective} onChange={sd("objective")} maxLength={400} />
          </div>
          <div>
            <label htmlFor="audience" className="label">
              Pubblico
            </label>
            <textarea id="audience" className={area} value={d.audience} onChange={sd("audience")} maxLength={400} />
          </div>
          <div>
            <label htmlFor="leadMagnet" className="label">
              Lead magnet
            </label>
            <input id="leadMagnet" className="input" value={d.leadMagnet} onChange={sd("leadMagnet")} maxLength={300} />
          </div>
          <div>
            <label htmlFor="cta" className="label">
              Invito all&apos;azione <span className="font-normal text-ink-faint">max 60 caratteri</span>
            </label>
            <input id="cta" className="input" value={d.cta} onChange={sd("cta")} maxLength={60} />
          </div>
        </div>
      </section>

      <section className="card p-4" aria-labelledby="e-pagine">
        <h2 id="e-pagine" className="card-title mb-3">
          Sequenza delle pagine
        </h2>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <Riga key={i} i={i} n={steps.length} onUp={() => setSteps((a) => sposta(a, i, -1))} onDown={() => setSteps((a) => sposta(a, i, 1))} onDel={() => setSteps((a) => a.filter((_, j) => j !== i))}>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.4fr)]">
                <select className="input" aria-label="Tipo di pagina" value={s.tipo} onChange={(e) => upd(setSteps, i, { tipo: e.target.value as FunnelStep["tipo"] })}>
                  {FUNNEL_STEP_TIPI.map((t) => (
                    <option key={t} value={t}>
                      {TIPO_FUNNEL[t]}
                    </option>
                  ))}
                </select>
                <input className="input" aria-label="Titolo" placeholder="Titolo" value={s.titolo} onChange={(e) => upd(setSteps, i, { titolo: e.target.value })} maxLength={120} />
                <input className="input" aria-label="Descrizione" placeholder="Cosa contiene" value={s.descrizione ?? ""} onChange={(e) => upd(setSteps, i, { descrizione: e.target.value })} maxLength={300} />
              </div>
            </Riga>
          ))}
        </ol>
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setSteps((a) => [...a, { ordine: a.length + 1, tipo: "EMAIL", titolo: "", descrizione: "" }])} disabled={steps.length >= 10}>
          <Plus size={14} /> Aggiungi pagina
        </button>
      </section>

      <section className="card p-4" aria-labelledby="e-campi">
        <h2 id="e-campi" className="card-title">
          Campi del form
        </h2>
        <p className="mb-3 mt-1 text-[12.5px] text-ink-faint">Nome e telefono servono al CRM e restano obbligatori. Il consenso privacy viene aggiunto sempre in automatico.</p>
        <ol className="space-y-2">
          {campi.map((c, i) => {
            const bloccato = (CAMPI_OBBLIGATORI as readonly string[]).includes(c.nome);
            return (
              <Riga key={i} i={i} n={campi.length} bloccata={bloccato} onUp={() => setCampi((a) => sposta(a, i, -1))} onDown={() => setCampi((a) => sposta(a, i, 1))} onDel={() => setCampi((a) => a.filter((_, j) => j !== i))}>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[minmax(0,1.4fr)_150px_auto]">
                  <input className="input" aria-label="Etichetta" placeholder="Domanda o etichetta" value={c.etichetta} onChange={(e) => upd(setCampi, i, { etichetta: e.target.value })} maxLength={120} />
                  <select className="input" aria-label="Tipo di campo" value={c.tipo} disabled={bloccato} onChange={(e) => upd(setCampi, i, { tipo: e.target.value as FormField["tipo"] })}>
                    {TIPI_CAMPO.map((t) => (
                      <option key={t} value={t}>
                        {TIPO_CAMPO_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <label className="flex min-h-[40px] items-center gap-2 text-[13px]">
                    <input type="checkbox" className="h-4 w-4 accent-[#0F2340]" checked={c.obbligatorio} disabled={bloccato} onChange={(e) => upd(setCampi, i, { obbligatorio: e.target.checked })} />
                    Obbligatorio
                  </label>
                </div>
                {c.tipo === "scelta" && (
                  <input className="input mt-2" aria-label="Opzioni" placeholder="Opzioni separate da virgola" value={(c.opzioni ?? []).join(", ")} onChange={(e) => upd(setCampi, i, { opzioni: e.target.value.split(",").map((o) => o.trimStart()) })} />
                )}
                <p className="mt-1 font-mono text-[11px] text-ink-faint">{c.nome.startsWith("campoNuovo") ? "nome tecnico creato al salvataggio" : c.nome}</p>
              </Riga>
            );
          })}
        </ol>
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={nuovoCampo} disabled={campi.length >= 15}>
          <Plus size={14} /> Aggiungi campo
        </button>
      </section>

      <section className="card p-4" aria-labelledby="e-email">
        <h2 id="e-email" className="card-title">
          Email di follow-up
        </h2>
        <p className="mb-3 mt-1 text-[12.5px] text-ink-faint">Segnaposto: {"{nome}"}, {"{consulente}"}. Vengono ordinate per giorno al salvataggio.</p>
        <ol className="space-y-2">
          {emails.map((e, i) => (
            <Riga key={i} i={i} n={emails.length} onUp={() => setEmails((a) => sposta(a, i, -1))} onDown={() => setEmails((a) => sposta(a, i, 1))} onDel={() => setEmails((a) => a.filter((_, j) => j !== i))}>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[110px_minmax(0,1fr)]">
                <label className="text-[12.5px] text-ink-soft">
                  Dopo giorni
                  <input type="number" min={0} max={90} className="input mt-1" value={e.giorno} onChange={(ev) => upd(setEmails, i, { giorno: Number(ev.target.value) })} />
                </label>
                <label className="text-[12.5px] text-ink-soft">
                  Oggetto
                  <input className="input mt-1" value={e.oggetto} onChange={(ev) => upd(setEmails, i, { oggetto: ev.target.value })} maxLength={140} />
                </label>
              </div>
              <textarea className={`${area} mt-2`} aria-label="Testo dell'email" value={e.testo} onChange={(ev) => upd(setEmails, i, { testo: ev.target.value })} maxLength={2000} />
            </Riga>
          ))}
        </ol>
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setEmails((a) => [...a, { giorno: (a.at(-1)?.giorno ?? 0) + 3, oggetto: "", testo: "" }])} disabled={emails.length >= 8}>
          <Plus size={14} /> Aggiungi email
        </button>
      </section>

      <section className="card p-4" aria-labelledby="e-wa">
        <h2 id="e-wa" className="card-title mb-3">
          Messaggi WhatsApp
        </h2>
        <ol className="space-y-2">
          {wa.map((w, i) => (
            <Riga key={i} i={i} n={wa.length} onUp={() => setWa((a) => sposta(a, i, -1))} onDown={() => setWa((a) => sposta(a, i, 1))} onDel={() => setWa((a) => a.filter((_, j) => j !== i))}>
              <input className="input" aria-label="Quando" placeholder="Quando (es. entro 1 ora)" value={w.momento} onChange={(e) => upd(setWa, i, { momento: e.target.value })} maxLength={120} />
              <textarea className={`${area} mt-2`} aria-label="Testo del messaggio" value={w.testo} onChange={(e) => upd(setWa, i, { testo: e.target.value })} maxLength={700} />
            </Riga>
          ))}
        </ol>
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setWa((a) => [...a, { momento: "", testo: "" }])} disabled={wa.length >= 6}>
          <Plus size={14} /> Aggiungi messaggio
        </button>
      </section>

      <section className="card p-4" aria-labelledby="e-qual">
        <h2 id="e-qual" className="card-title mb-3">
          Lead qualificato se… <span className="text-[12.5px] font-normal text-ink-faint">uno per riga</span>
        </h2>
        <textarea aria-labelledby="e-qual" className={area} value={d.qualificazione} onChange={sd("qualificazione")} />
      </section>

      <div className="sticky bottom-20 z-20 lg:bottom-4">
        <div className="card flex flex-wrap items-center gap-3 p-3 shadow-pop">
          {esito && (
            <p role="status" className={`flex items-center gap-1.5 text-[13px] font-medium ${esito.ok ? "text-ok" : "text-danger"}`}>
              {esito.ok ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />} {esito.msg}
            </p>
          )}
          <div className="ml-auto flex gap-2">
            <Link href={`/funnel/${f.id}`} className="btn-ghost">
              Torna al funnel
            </Link>
            <button type="button" className="btn-primary" onClick={salva} disabled={pending}>
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
