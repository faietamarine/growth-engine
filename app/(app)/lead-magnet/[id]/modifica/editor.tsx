"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Save, Loader2, CheckCircle2, TriangleAlert } from "lucide-react";
import type { LeadMagnet } from "@/db/schema";
import type { LeadMagnetContent } from "@/types/lead-magnet";
import { LIMITI } from "@/types/lead-magnet";
import { controllaLimiti } from "@/lib/leadmagnets/generate";
import { Counter } from "@/components/ui/copy-button";
import { modificaLeadMagnet } from "../../actions";

/* Le liste si scrivono una voce per riga; coppie con "|"; la struttura con "## Titolo" e "- punto". */
const righe = (t: string) =>
  t
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
const coppie = (t: string) =>
  righe(t).map((r) => {
    const [a, ...b] = r.split("|");
    return [a.trim(), b.join("|").trim()] as const;
  });
function strutturaDaTesto(t: string) {
  const out: { titolo: string; punti: string[] }[] = [];
  for (const r of righe(t)) {
    if (r.startsWith("## ")) out.push({ titolo: r.slice(3).trim(), punti: [] });
    else {
      const punto = r.replace(/^[-•]\s*/, "");
      if (!out.length) out.push({ titolo: "Contenuto", punti: [] });
      out[out.length - 1].punti.push(punto);
    }
  }
  return out;
}
const strutturaATesto = (s: LeadMagnetContent["struttura"]) => s.map((x) => [`## ${x.titolo}`, ...x.punti.map((p) => `- ${p}`)].join("\n")).join("\n\n");

const area = "input min-h-[90px] py-2 leading-relaxed";

function Campo({ id, label, hint, counter, children }: { id: string; label: string; hint?: string; counter?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-end justify-between gap-2">
        <label htmlFor={id} className="label mb-0">
          {label} {hint && <span className="font-normal text-ink-faint">{hint}</span>}
        </label>
        {counter}
      </div>
      {children}
    </div>
  );
}

export function LmEditor({ lm, campagne }: { lm: LeadMagnet; campagne: { id: string; name: string }[] }) {
  const c = lm.content;
  const [title, setTitle] = useState(lm.title);
  const [campaignId, setCampaignId] = useState(lm.campaignId ?? "");
  const [f, setF] = useState({
    sottotitolo: c.sottotitolo,
    promessa: c.promessa,
    benefici: c.benefici.join("\n"),
    obiezioni: c.obiezioni.map((o) => `${o.obiezione} | ${o.risposta}`).join("\n"),
    struttura: strutturaATesto(c.struttura),
    headline: c.landing.headline,
    lSottotitolo: c.landing.sottotitolo,
    bullet: c.landing.bullet.join("\n"),
    faq: c.landing.faq.map((x) => `${x.domanda} | ${x.risposta}`).join("\n"),
    cta: c.landing.cta,
    provaSociale: c.landing.provaSociale,
    gTitoli: c.googleAds.titoli.join("\n"),
    gDescr: c.googleAds.descrizioni.join("\n"),
    oggetto: c.email.oggetto,
    anteprima: c.email.anteprima,
    testo: c.email.testo,
    whatsapp: c.whatsapp.join("\n"),
    pImg: c.promptImmagini.join("\n"),
    pVid: c.promptVideo.join("\n"),
    checklist: c.checklist.map((x) => x.voce).join("\n"),
  });
  const [meta, setMeta] = useState(() => [0, 1, 2].map((i) => c.metaAds[i] ?? { testoPrincipale: "", titolo: "", descrizione: "" }));
  const [esito, setEsito] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, start] = useTransition();
  const s = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const content: LeadMagnetContent = useMemo(
    () => ({
      ...c,
      titolo: title,
      sottotitolo: f.sottotitolo,
      promessa: f.promessa,
      benefici: righe(f.benefici),
      obiezioni: coppie(f.obiezioni).map(([obiezione, risposta]) => ({ obiezione, risposta })),
      struttura: strutturaDaTesto(f.struttura),
      landing: { headline: f.headline, sottotitolo: f.lSottotitolo, bullet: righe(f.bullet), faq: coppie(f.faq).map(([domanda, risposta]) => ({ domanda, risposta })), cta: f.cta, provaSociale: f.provaSociale },
      metaAds: meta.filter((m) => m.testoPrincipale.trim() || m.titolo.trim()),
      googleAds: { titoli: righe(f.gTitoli), descrizioni: righe(f.gDescr) },
      email: { oggetto: f.oggetto, anteprima: f.anteprima, testo: f.testo },
      whatsapp: righe(f.whatsapp),
      promptImmagini: righe(f.pImg),
      promptVideo: righe(f.pVid),
      checklist: righe(f.checklist).map((voce) => ({ voce, fatto: c.checklist.find((x) => x.voce === voce)?.fatto ?? false })),
    }),
    [c, title, f, meta],
  );
  const avvisi = controllaLimiti(content);

  function salva() {
    setEsito(null);
    start(async () => setEsito(await modificaLeadMagnet(lm.id, { title, campaignId, content })));
  }

  return (
    <div className="space-y-4">
      <section className="card grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:grid-cols-2" aria-label="Dati principali">
        <div className="md:col-span-2">
          <Campo id="title" label="Titolo">
            <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          </Campo>
        </div>
        <Campo id="campaignId" label="Campagna">
          <select id="campaignId" className="input" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">Nessuna</option>
            {campagne.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="sottotitolo" label="Sottotitolo">
          <input id="sottotitolo" className="input" value={f.sottotitolo} onChange={s("sottotitolo")} maxLength={300} />
        </Campo>
        <div className="md:col-span-2">
          <Campo id="promessa" label="Promessa">
            <textarea id="promessa" className={area} value={f.promessa} onChange={s("promessa")} maxLength={400} />
          </Campo>
        </div>
        <Campo id="benefici" label="Benefici" hint="uno per riga">
          <textarea id="benefici" className={area} value={f.benefici} onChange={s("benefici")} />
        </Campo>
        <Campo id="obiezioni" label="Obiezioni" hint="obiezione | risposta">
          <textarea id="obiezioni" className={area} value={f.obiezioni} onChange={s("obiezioni")} />
        </Campo>
        <div className="md:col-span-2">
          <Campo id="struttura" label="Struttura del contenuto" hint="«## Titolo» per le sezioni, «- punto» per i punti">
            <textarea id="struttura" className={`${area} min-h-[180px] font-mono text-[13px]`} value={f.struttura} onChange={s("struttura")} />
          </Campo>
        </div>
      </section>

      <section className="card grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:grid-cols-2" aria-labelledby="ed-landing">
        <h2 id="ed-landing" className="card-title md:col-span-2">
          Landing page
        </h2>
        <Campo id="headline" label="Headline">
          <input id="headline" className="input" value={f.headline} onChange={s("headline")} maxLength={160} />
        </Campo>
        <Campo id="cta" label="Pulsante" counter={<Counter n={f.cta.length} max={60} />}>
          <input id="cta" className="input" value={f.cta} onChange={s("cta")} maxLength={60} />
        </Campo>
        <div className="md:col-span-2">
          <Campo id="lSottotitolo" label="Sottotitolo della landing">
            <input id="lSottotitolo" className="input" value={f.lSottotitolo} onChange={s("lSottotitolo")} maxLength={300} />
          </Campo>
        </div>
        <Campo id="bullet" label="Punti elenco" hint="uno per riga">
          <textarea id="bullet" className={area} value={f.bullet} onChange={s("bullet")} />
        </Campo>
        <Campo id="faq" label="Domande frequenti" hint="domanda | risposta">
          <textarea id="faq" className={area} value={f.faq} onChange={s("faq")} />
        </Campo>
        <div className="md:col-span-2">
          <Campo id="provaSociale" label="Prova sociale">
            <input id="provaSociale" className="input" value={f.provaSociale} onChange={s("provaSociale")} maxLength={300} />
          </Campo>
        </div>
      </section>

      <section className="card p-4" aria-labelledby="ed-meta">
        <h2 id="ed-meta" className="card-title mb-3">
          Annunci Meta
        </h2>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-3">
          {[0, 1, 2].map((i) => {
            const m = meta[i];
            const set = (k: keyof typeof m, v: string) => setMeta((a) => a.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
            return (
              <fieldset key={i} className="space-y-2 rounded-md border border-line p-3">
                <legend className="px-1 text-[12px] font-semibold text-ink-faint">Variante {String.fromCharCode(65 + i)}</legend>
                <Campo id={`mt${i}`} label="Testo principale" counter={<Counter n={m.testoPrincipale.length} max={LIMITI.metaTesto} />}>
                  <textarea id={`mt${i}`} className={area} value={m.testoPrincipale} onChange={(e) => set("testoPrincipale", e.target.value)} />
                </Campo>
                <Campo id={`mh${i}`} label="Titolo" counter={<Counter n={m.titolo.length} max={LIMITI.metaTitolo} />}>
                  <input id={`mh${i}`} className="input" value={m.titolo} onChange={(e) => set("titolo", e.target.value)} />
                </Campo>
                <Campo id={`md${i}`} label="Descrizione" counter={<Counter n={m.descrizione.length} max={LIMITI.metaDescrizione} />}>
                  <input id={`md${i}`} className="input" value={m.descrizione} onChange={(e) => set("descrizione", e.target.value)} />
                </Campo>
              </fieldset>
            );
          })}
        </div>
      </section>

      <section className="card grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:grid-cols-2" aria-labelledby="ed-google">
        <h2 id="ed-google" className="card-title md:col-span-2">
          Annunci Google
        </h2>
        <Campo id="gTitoli" label={`Titoli (${righe(f.gTitoli).length}/15)`} hint={`uno per riga, max ${LIMITI.googleTitolo} caratteri`}>
          <textarea id="gTitoli" className={`${area} min-h-[160px]`} value={f.gTitoli} onChange={s("gTitoli")} />
        </Campo>
        <Campo id="gDescr" label={`Descrizioni (${righe(f.gDescr).length}/4)`} hint={`una per riga, max ${LIMITI.googleDescrizione} caratteri`}>
          <textarea id="gDescr" className={`${area} min-h-[160px]`} value={f.gDescr} onChange={s("gDescr")} />
        </Campo>
      </section>

      <section className="card grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:grid-cols-2" aria-labelledby="ed-msg">
        <h2 id="ed-msg" className="card-title md:col-span-2">
          Email e WhatsApp
        </h2>
        <Campo id="oggetto" label="Oggetto email" counter={<Counter n={f.oggetto.length} max={LIMITI.emailOggetto} />}>
          <input id="oggetto" className="input" value={f.oggetto} onChange={s("oggetto")} />
        </Campo>
        <Campo id="anteprima" label="Anteprima" counter={<Counter n={f.anteprima.length} max={LIMITI.emailAnteprima} />}>
          <input id="anteprima" className="input" value={f.anteprima} onChange={s("anteprima")} />
        </Campo>
        <Campo id="testo" label="Testo email" hint="segnaposto {nome}, {consulente}">
          <textarea id="testo" className={`${area} min-h-[160px]`} value={f.testo} onChange={s("testo")} maxLength={3000} />
        </Campo>
        <Campo id="whatsapp" label="Messaggi WhatsApp" hint="uno per riga">
          <textarea id="whatsapp" className={`${area} min-h-[160px]`} value={f.whatsapp} onChange={s("whatsapp")} />
        </Campo>
      </section>

      <section className="card grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:grid-cols-3" aria-labelledby="ed-altro">
        <h2 id="ed-altro" className="card-title md:col-span-3">
          Prompt e checklist
        </h2>
        <Campo id="pImg" label="Prompt immagini" hint="uno per riga">
          <textarea id="pImg" className={area} value={f.pImg} onChange={s("pImg")} />
        </Campo>
        <Campo id="pVid" label="Prompt video" hint="uno per riga">
          <textarea id="pVid" className={area} value={f.pVid} onChange={s("pVid")} />
        </Campo>
        <Campo id="checklist" label="Voci della checklist" hint="una per riga; le spunte restano">
          <textarea id="checklist" className={area} value={f.checklist} onChange={s("checklist")} />
        </Campo>
      </section>

      <div className="sticky bottom-20 z-20 lg:bottom-4">
        <div className="card flex flex-wrap items-center gap-3 p-3 shadow-pop">
          {avvisi.length > 0 && !esito && (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-warn">
              <TriangleAlert size={15} /> {avvisi.length === 1 ? "1 testo oltre il limite" : `${avvisi.length} testi oltre i limiti`}: {avvisi.slice(0, 2).map((a) => a.campo).join(", ")}
              {avvisi.length > 2 ? "…" : ""}
            </p>
          )}
          {esito && (
            <p role="status" className={`flex items-center gap-1.5 text-[13px] font-medium ${esito.ok ? "text-ok" : "text-danger"}`}>
              {esito.ok ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />} {esito.msg}
            </p>
          )}
          <div className="ml-auto flex gap-2">
            <Link href={`/lead-magnet/${lm.id}`} className="btn-ghost">
              Torna al lead magnet
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
