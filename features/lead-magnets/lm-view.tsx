"use client";

import { useOptimistic, useTransition } from "react";
import { TriangleAlert, Target, ListTree, PanelsTopLeft, Megaphone, Search, Mail, MessageCircle, Camera, ClipboardCheck } from "lucide-react";
import type { LeadMagnetContent } from "@/types/lead-magnet";
import { LIMITI } from "@/types/lead-magnet";
import { controllaLimiti } from "@/lib/leadmagnets/generate";
import { anteprimaTesto } from "@/lib/funnels/templates";
import { CopyButton, Counter } from "@/components/ui/copy-button";

function Card({ id, icon: Icon, title, extra, children }: { id: string; icon: typeof Target; title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card" aria-labelledby={id}>
      <div className="card-head">
        <h2 id={id} className="card-title flex items-center gap-2">
          <Icon size={16} className="text-gold" strokeWidth={1.9} /> {title}
        </h2>
        {extra}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

const Etichetta = ({ children }: { children: React.ReactNode }) => <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">{children}</p>;

function Punti({ voci }: { voci: string[] }) {
  return (
    <ul className="space-y-1.5 text-[13.5px]">
      {voci.map((v, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
          {v}
        </li>
      ))}
    </ul>
  );
}

export function LmView({ c, onToggle }: { c: LeadMagnetContent; onToggle?: (i: number, fatto: boolean) => Promise<{ ok: boolean; msg?: string }> }) {
  const avvisi = controllaLimiti(c);
  const [checklist, setOpt] = useOptimistic(c.checklist, (s, { i, fatto }: { i: number; fatto: boolean }) => s.map((x, j) => (j === i ? { ...x, fatto } : x)));
  const [, start] = useTransition();
  const fatte = checklist.filter((x) => x.fatto).length;
  const google = [...c.googleAds.titoli.map((t) => `Titolo: ${t}`), ...c.googleAds.descrizioni.map((d) => `Descrizione: ${d}`)].join("\n");

  return (
    <div className="space-y-4">
      {avvisi.length > 0 && (
        <section className="rounded-lg border border-danger/30 bg-danger/[.05] px-4 py-3" aria-label="Testi oltre i limiti">
          <p className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-danger">
            <TriangleAlert size={15} /> {avvisi.length === 1 ? "Un testo supera" : `${avvisi.length} testi superano`} i limiti delle piattaforme
          </p>
          <ul className="list-disc pl-5 text-[12.5px]">
            {avvisi.map((a, i) => (
              <li key={i}>
                {a.campo}: {a.lunghezza} caratteri su {a.limite}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Card id="lm-sintesi" icon={Target} title="Titolo, promessa e benefici">
        <p className="font-display text-[19px] font-semibold leading-snug">{c.titolo}</p>
        <p className="mt-1 text-[14px] text-ink-soft">{c.sottotitolo}</p>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
          <div>
            <Etichetta>Promessa</Etichetta>
            <p className="mt-1 text-[13.5px]">{c.promessa}</p>
            <div className="mt-3">
              <Etichetta>Benefici</Etichetta>
              <div className="mt-1">
                <Punti voci={c.benefici} />
              </div>
            </div>
          </div>
          <div>
            <Etichetta>Obiezioni da gestire</Etichetta>
            <ul className="mt-1 space-y-2 text-[13.5px]">
              {c.obiezioni.map((o, i) => (
                <li key={i}>
                  <b>«{o.obiezione}»</b>
                  <span className="block text-ink-soft">{o.risposta}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card id="lm-struttura" icon={ListTree} title="Struttura del contenuto">
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          {c.struttura.map((s, i) => (
            <li key={i} className="rounded-md border border-line p-3">
              <p className="text-[13.5px] font-semibold">{s.titolo}</p>
              <ul className="mt-1 list-disc pl-5 text-[13px] text-ink-soft">
                {s.punti.map((p, j) => (
                  <li key={j}>{p}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Card>

      <Card id="lm-landing" icon={PanelsTopLeft} title="Testi della landing page">
        <div className="rounded-lg bg-[#0C1A30] px-5 py-6 text-white">
          <p className="font-display text-[22px] font-semibold leading-tight">{c.landing.headline}</p>
          <p className="mt-2 text-[14px] text-white/75">{c.landing.sottotitolo}</p>
          <ul className="mt-4 space-y-1.5 text-[14px]">
            {c.landing.bullet.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#E6C877]">✓</span>
                {b}
              </li>
            ))}
          </ul>
          <span className="mt-5 inline-block rounded-md bg-[#B8892F] px-4 py-2.5 text-[14px] font-semibold text-[#0C1A30]">{c.landing.cta}</span>
          <p className="mt-3 text-[12px] text-white/60">{c.landing.provaSociale}</p>
        </div>
        <div className="mt-4">
          <Etichetta>Domande frequenti</Etichetta>
          <dl className="mt-1 divide-y divide-line rounded-md border border-line">
            {c.landing.faq.map((f, i) => (
              <div key={i} className="px-3 py-2 text-[13.5px]">
                <dt className="font-semibold">{f.domanda}</dt>
                <dd className="text-ink-soft">{f.risposta}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Card>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card id="lm-meta" icon={Megaphone} title={`Annunci Meta · ${c.metaAds.length} varianti`}>
          <ul className="space-y-3">
            {c.metaAds.map((m, i) => (
              <li key={i} className="rounded-md border border-line p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-ink-faint">Variante {String.fromCharCode(65 + i)}</span>
                  <CopyButton text={`${m.testoPrincipale}\n\nTitolo: ${m.titolo}\nDescrizione: ${m.descrizione}`} />
                </div>
                <p className="text-[13.5px]">
                  {m.testoPrincipale} <Counter n={m.testoPrincipale.length} max={LIMITI.metaTesto} />
                </p>
                <p className="mt-2 text-[13.5px] font-semibold">
                  {m.titolo} <Counter n={m.titolo.length} max={LIMITI.metaTitolo} />
                </p>
                <p className="text-[12.5px] text-ink-soft">
                  {m.descrizione} <Counter n={m.descrizione.length} max={LIMITI.metaDescrizione} />
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card id="lm-google" icon={Search} title="Annunci Google" extra={<CopyButton text={google} label="Copia tutto" />}>
          <Etichetta>
            Titoli ({c.googleAds.titoli.length}, max {LIMITI.googleTitolo} caratteri)
          </Etichetta>
          <ul className="mb-3 mt-1 divide-y divide-line text-[13.5px]">
            {c.googleAds.titoli.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-1.5">
                {t} <Counter n={t.length} max={LIMITI.googleTitolo} />
              </li>
            ))}
          </ul>
          <Etichetta>
            Descrizioni (max {LIMITI.googleDescrizione} caratteri)
          </Etichetta>
          <ul className="mt-1 divide-y divide-line text-[13.5px]">
            {c.googleAds.descrizioni.map((d, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-1.5">
                {d} <Counter n={d.length} max={LIMITI.googleDescrizione} />
              </li>
            ))}
          </ul>
        </Card>

        <Card id="lm-email" icon={Mail} title="Email" extra={<CopyButton text={`Oggetto: ${c.email.oggetto}\nAnteprima: ${c.email.anteprima}\n\n${c.email.testo}`} />}>
          <p className="text-[13.5px] font-semibold">
            {anteprimaTesto(c.email.oggetto)} <Counter n={c.email.oggetto.length} max={LIMITI.emailOggetto} />
          </p>
          <p className="text-[12.5px] text-ink-soft">
            {c.email.anteprima} <Counter n={c.email.anteprima.length} max={LIMITI.emailAnteprima} />
          </p>
          <p className="mt-2 whitespace-pre-line rounded-md bg-hover px-3 py-2 text-[13px]">{anteprimaTesto(c.email.testo)}</p>
        </Card>

        <Card id="lm-wa" icon={MessageCircle} title="Messaggi WhatsApp">
          <ul className="space-y-3">
            {c.whatsapp.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <p className="min-w-0 flex-1 rounded-lg rounded-tl-none bg-ok/10 px-3 py-2 text-[13px]">{anteprimaTesto(w)}</p>
                <CopyButton text={w} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] text-ink-faint">Anteprima con nomi di esempio; si copia con i segnaposto {"{nome}"} e {"{consulente}"}.</p>
        </Card>
      </div>

      <Card id="lm-prompt" icon={Camera} title="Prompt per immagini e video">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          {[
            { t: "Immagini", v: c.promptImmagini },
            { t: "Video", v: c.promptVideo },
          ].map(({ t, v }) => (
            <div key={t}>
              <Etichetta>{t}</Etichetta>
              <ul className="mt-1 space-y-2">
                {v.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-md border border-line p-2.5 text-[13px]">
                    <span className="min-w-0 flex-1">{p}</span>
                    <CopyButton text={p} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] text-ink-faint">Per gli annunci usa foto dei vostri mezzi o immagini generate senza marchi di altri; per le persone riconoscibili serve la liberatoria.</p>
      </Card>

      <Card
        id="lm-check"
        icon={ClipboardCheck}
        title="Checklist di pubblicazione"
        extra={
          <span className={`num text-[12.5px] font-semibold ${fatte === checklist.length ? "text-ok" : "text-ink-soft"}`}>
            {fatte}/{checklist.length}
          </span>
        }
      >
        <ul className="space-y-1">
          {checklist.map((x, i) => (
            <li key={i}>
              <label className={`flex items-start gap-3 rounded-md px-2 py-1.5 text-[13.5px] ${onToggle ? "cursor-pointer hover:bg-hover" : ""}`}>
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#2F8F5B]"
                  checked={x.fatto}
                  disabled={!onToggle}
                  onChange={(e) => {
                    const fatto = e.target.checked;
                    start(async () => {
                      setOpt({ i, fatto });
                      const r = await onToggle!(i, fatto);
                      if (!r.ok && r.msg) window.alert(r.msg);
                    });
                  }}
                />
                <span className={x.fatto ? "text-ink-faint line-through" : ""}>{x.voce}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11.5px] text-ink-faint">Si può pubblicare solo con la checklist completa.</p>
      </Card>
    </div>
  );
}
