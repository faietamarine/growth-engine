"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowUp, ArrowDown, Trash2, Plus, Save, Loader2, CheckCircle2, TriangleAlert, Monitor, Smartphone, Lock, ChevronDown } from "lucide-react";
import type { FormField } from "@/db/schema";
import type { Blocco, TipoBlocco } from "@/types/landing";
import { TIPI_BLOCCO, bloccoVuoto, embedVideo, problemiPubblicazione } from "@/lib/landing/blocks";
import { CAMPI_OBBLIGATORI } from "@/lib/funnels/templates";
import { TIPI_CAMPO, nomeCampo } from "@/lib/funnels/validation";
import { salvaBozzaLanding } from "../../actions";

const area = "input min-h-[80px] py-2 leading-relaxed";
const NOME_TIPO = Object.fromEntries(TIPI_BLOCCO.map((t) => [t.tipo, t.nome])) as Record<TipoBlocco, string>;
const TIPO_CAMPO_LABEL: Record<(typeof TIPI_CAMPO)[number], string> = { testo: "Testo", email: "Email", telefono: "Telefono", scelta: "Scelta", numero: "Numero", area: "Testo lungo" };

const righe = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean);
const coppie = (t: string) =>
  righe(t).map((r) => {
    const [a, ...b] = r.split("|");
    return [a.trim(), b.join("|").trim()] as const;
  });

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">
        {label} {hint && <span className="font-normal text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Area di testo "una voce per riga" che conserva le righe vuote mentre si scrive. */
function Righe({ valore, onCambio, hint, label }: { valore: string; onCambio: (t: string) => void; hint: string; label: string }) {
  return (
    <Campo label={label} hint={hint}>
      <textarea className={area} value={valore} onChange={(e) => onCambio(e.target.value)} />
    </Campo>
  );
}

function CampiForm({ campi, onCambio }: { campi: FormField[]; onCambio: (c: FormField[]) => void }) {
  const upd = (i: number, p: Partial<FormField>) => onCambio(campi.map((c, j) => (j === i ? { ...c, ...p } : c)));
  return (
    <div className="space-y-2">
      <span className="label">Campi del form</span>
      {campi.map((c, i) => {
        const bloccato = (CAMPI_OBBLIGATORI as readonly string[]).includes(c.nome);
        return (
          <div key={`${c.nome}-${i}`} className="rounded-md border border-line p-2.5">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[minmax(0,1.4fr)_130px]">
              <input className="input" aria-label="Etichetta" value={c.etichetta} onChange={(e) => upd(i, { etichetta: e.target.value })} maxLength={120} />
              <select className="input" aria-label="Tipo" value={c.tipo} disabled={bloccato} onChange={(e) => upd(i, { tipo: e.target.value as FormField["tipo"] })}>
                {TIPI_CAMPO.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_CAMPO_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            {c.tipo === "scelta" && (
              <input className="input mt-2" aria-label="Opzioni" placeholder="Opzioni separate da virgola" value={(c.opzioni ?? []).join(", ")} onChange={(e) => upd(i, { opzioni: e.target.value.split(",").map((o) => o.trimStart()) })} />
            )}
            <div className="mt-2 flex items-center gap-2 text-[13px]">
              <label className="mr-auto flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-[#0F2340]" checked={c.obbligatorio} disabled={bloccato} onChange={(e) => upd(i, { obbligatorio: e.target.checked })} />
                Obbligatorio
              </label>
              <button type="button" className="btn-ghost btn-sm px-2" disabled={i === 0} onClick={() => onCambio(sposta(campi, i, -1))} aria-label="Sposta su">
                <ArrowUp size={14} />
              </button>
              <button type="button" className="btn-ghost btn-sm px-2" disabled={i === campi.length - 1} onClick={() => onCambio(sposta(campi, i, 1))} aria-label="Sposta giù">
                <ArrowDown size={14} />
              </button>
              {bloccato ? (
                <span className="flex items-center gap-1 px-1 text-[11.5px] text-ink-faint" title="Serve al CRM">
                  <Lock size={12} /> necessario
                </span>
              ) : (
                <button type="button" className="btn-ghost btn-sm px-2 text-danger" onClick={() => onCambio(campi.filter((_, j) => j !== i))} aria-label="Elimina campo">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="btn-ghost btn-sm"
        disabled={campi.length >= 15}
        onClick={() => {
          const usati = new Set(campi.map((c) => c.nome));
          let n = "domanda";
          for (let k = 2; usati.has(n); k++) n = `domanda${k}`;
          onCambio([...campi, { nome: n, etichetta: "Nuova domanda", tipo: "testo", obbligatorio: false }]);
        }}
      >
        <Plus size={14} /> Aggiungi campo
      </button>
    </div>
  );
}

function sposta<T>(a: T[], i: number, d: -1 | 1): T[] {
  const j = i + d;
  if (j < 0 || j >= a.length) return a;
  const b = [...a];
  [b[i], b[j]] = [b[j], b[i]];
  return b;
}

/** Editor dei campi di un blocco. Le liste testuali tengono una "bozza di testo" per non perdere le righe vuote mentre si scrive. */
function EditorBlocco({ b, onCambio }: { b: Blocco; onCambio: (b: Blocco) => void }) {
  const [testi, setTesti] = useState<Record<string, string>>(() => ({
    voci: b.tipo === "punti" ? b.voci.join("\n") : "",
    faq: b.tipo === "faq" ? b.voci.map((v) => `${v.domanda} | ${v.risposta}`).join("\n") : "",
    test: b.tipo === "testimonianze" ? b.voci.map((v) => `${v.testo} | ${v.autore}`).join("\n") : "",
  }));
  const set = <K extends keyof Blocco>(k: K, v: unknown) => onCambio({ ...b, [k]: v } as Blocco);
  const inp = (k: string, label: string, max = 160, hint?: string) => (
    <Campo label={label} hint={hint}>
      <input className="input" value={String((b as Record<string, unknown>)[k] ?? "")} maxLength={max} onChange={(e) => set(k as keyof Blocco, e.target.value)} />
    </Campo>
  );
  switch (b.tipo) {
    case "hero":
      return (
        <div className="space-y-3">
          {inp("headline", "Titolo")}
          <Campo label="Sottotitolo">
            <textarea className={area} value={b.sottotitolo} maxLength={300} onChange={(e) => set("sottotitolo" as keyof Blocco, e.target.value)} />
          </Campo>
          {inp("immagine", "Immagine di sfondo", 500, "indirizzo https, facoltativa")}
          {inp("cta", "Pulsante", 60)}
        </div>
      );
    case "punti":
      return (
        <div className="space-y-3">
          {inp("titolo", "Titolo della sezione", 120)}
          <Righe
            label="Punti"
            hint="uno per riga"
            valore={testi.voci}
            onCambio={(t) => {
              setTesti((x) => ({ ...x, voci: t }));
              onCambio({ ...b, voci: righe(t) });
            }}
          />
        </div>
      );
    case "testo":
      return (
        <div className="space-y-3">
          {inp("titolo", "Titolo", 160, "facoltativo")}
          <Campo label="Testo">
            <textarea className={`${area} min-h-[140px]`} value={b.testo} maxLength={3000} onChange={(e) => set("testo" as keyof Blocco, e.target.value)} />
          </Campo>
        </div>
      );
    case "immagine":
      return (
        <div className="space-y-3">
          {inp("url", "Indirizzo dell'immagine", 500, "https")}
          {inp("didascalia", "Descrizione", 200, "per chi non vede l'immagine")}
        </div>
      );
    case "video":
      return (
        <div className="space-y-3">
          {inp("url", "Link YouTube o Vimeo", 500)}
          {b.url && !embedVideo(b.url) && <p className="text-[12.5px] font-medium text-danger">Link non riconosciuto: usa l&apos;indirizzo di un video YouTube o Vimeo.</p>}
          {inp("titolo", "Titolo", 160, "facoltativo")}
        </div>
      );
    case "form":
      return (
        <div className="space-y-3">
          {inp("titolo", "Titolo del form")}
          {inp("sottotitolo", "Sottotitolo", 300)}
          {inp("cta", "Pulsante", 60)}
          <Campo label="Messaggio dopo l'invio">
            <textarea className={area} value={b.grazie} maxLength={400} onChange={(e) => set("grazie" as keyof Blocco, e.target.value)} />
          </Campo>
          <CampiForm campi={b.campi} onCambio={(campi) => onCambio({ ...b, campi })} />
          <p className="text-[12px] text-ink-faint">Consenso privacy (obbligatorio) e consenso marketing (facoltativo) vengono aggiunti sempre.</p>
        </div>
      );
    case "testimonianze":
      return (
        <div className="space-y-3">
          {inp("titolo", "Titolo", 120)}
          <Righe
            label="Testimonianze"
            hint="una per riga · testo | nome"
            valore={testi.test}
            onCambio={(t) => {
              setTesti((x) => ({ ...x, test: t }));
              onCambio({ ...b, voci: coppie(t).filter(([a, n]) => a && n).map(([testo, autore]) => ({ testo, autore })) });
            }}
          />
          <p className="text-[12px] text-warn">Solo parole vere di clienti, con il loro permesso. Testimonianze inventate sono pubblicità ingannevole.</p>
        </div>
      );
    case "faq":
      return (
        <div className="space-y-3">
          {inp("titolo", "Titolo", 120)}
          <Righe
            label="Domande"
            hint="una per riga · domanda | risposta"
            valore={testi.faq}
            onCambio={(t) => {
              setTesti((x) => ({ ...x, faq: t }));
              onCambio({ ...b, voci: coppie(t).filter(([d, r]) => d && r).map(([domanda, risposta]) => ({ domanda, risposta })) });
            }}
          />
        </div>
      );
    case "cta":
      return (
        <div className="space-y-3">
          {inp("titolo", "Titolo")}
          {inp("testo", "Testo", 400, "facoltativo")}
          {inp("cta", "Pulsante", 60)}
        </div>
      );
  }
}

export function LandingEditor({ id, titoloIniziale, slugIniziale, slugBloccato, iniziali, stato }: { id: string; titoloIniziale: string; slugIniziale: string; slugBloccato: boolean; iniziali: Blocco[]; stato: string }) {
  const [title, setTitle] = useState(titoloIniziale);
  const [slug, setSlug] = useState(slugIniziale);
  const [blocks, setBlocks] = useState(iniziali);
  const [aperto, setAperto] = useState<string | null>(iniziali[0]?.id ?? null);
  const [device, setDevice] = useState<"pc" | "tel">("pc");
  const [vista, setVista] = useState<"modifica" | "anteprima">("modifica");
  const [esito, setEsito] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sporco, setSporco] = useState(false);
  const [pending, start] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);
  const problemi = useMemo(() => problemiPubblicazione(blocks), [blocks]);

  const invia = useCallback(() => frame.current?.contentWindow?.postMessage({ type: "ng-preview", blocks }, window.location.origin), [blocks]);
  useEffect(() => {
    const t = setTimeout(invia, 150);
    return () => clearTimeout(t);
  }, [invia]);
  useEffect(() => {
    const pronto = (e: MessageEvent) => e.origin === window.location.origin && e.data?.type === "ng-preview-ready" && invia();
    window.addEventListener("message", pronto);
    return () => window.removeEventListener("message", pronto);
  }, [invia]);
  useEffect(() => {
    if (!sporco) return;
    const avvisa = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avvisa);
    return () => window.removeEventListener("beforeunload", avvisa);
  }, [sporco]);

  const cambia = (nuovi: Blocco[]) => {
    setBlocks(nuovi);
    setSporco(true);
    setEsito(null);
  };

  function aggiungi(tipo: TipoBlocco) {
    const b = bloccoVuoto(tipo);
    // Il form va prima dei blocchi finali (FAQ, invito), le altre sezioni in fondo prima del form.
    const iForm = blocks.findIndex((x) => x.tipo === "form");
    const nuovi = [...blocks];
    nuovi.splice(tipo === "faq" || tipo === "cta" || iForm < 0 ? nuovi.length : iForm, 0, b);
    cambia(nuovi);
    setAperto(b.id);
  }

  function salva() {
    start(async () => {
      // I campi nuovi del form prendono il nome tecnico dall'etichetta.
      const pronti = blocks.map((b) =>
        b.tipo === "form"
          ? {
              ...b,
              campi: (() => {
                const usati = new Set<string>();
                return b.campi.map((c) => {
                  let nome = /^domanda\d*$/.test(c.nome) && c.etichetta.trim() ? nomeCampo(c.etichetta) : c.nome;
                  const base = nome;
                  for (let k = 2; usati.has(nome); k++) nome = `${base}${k}`;
                  usati.add(nome);
                  return { ...c, nome, opzioni: c.tipo === "scelta" ? (c.opzioni ?? []).map((o) => o.trim()).filter(Boolean) : undefined };
                });
              })(),
            }
          : b,
      );
      const r = await salvaBozzaLanding(id, { title, slug, blocks: pronti });
      setEsito(r);
      if (r.ok) {
        setBlocks(pronti);
        setSporco(false);
        if (r.slug) setSlug(r.slug);
      }
    });
  }

  const pannello = (
    <div className="space-y-3">
      <section className="card grid grid-cols-[minmax(0,1fr)] gap-3 p-4">
        <Campo label="Titolo della pagina">
          <input
            className="input"
            value={title}
            maxLength={120}
            onChange={(e) => {
              setTitle(e.target.value);
              setSporco(true);
            }}
          />
        </Campo>
        <Campo label="Indirizzo" hint={slugBloccato ? "non modificabile: la pagina è già stata online" : "solo lettere, numeri e trattini"}>
          <div className="flex items-center gap-1">
            <span className="text-[13px] text-ink-faint">/l/</span>
            <input
              className="input"
              value={slug}
              disabled={slugBloccato}
              maxLength={60}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                setSporco(true);
              }}
            />
          </div>
        </Campo>
      </section>

      <ol className="space-y-2">
        {blocks.map((b, i) => (
          <li key={b.id} className="card overflow-hidden">
            <div className="flex items-center gap-1 px-3 py-2">
              <button type="button" className="flex min-h-[36px] flex-1 items-center gap-2 text-left text-[13.5px] font-semibold" onClick={() => setAperto(aperto === b.id ? null : b.id)} aria-expanded={aperto === b.id}>
                <ChevronDown size={15} className={clsx("transition-transform", aperto === b.id ? "" : "-rotate-90")} />
                <span className="num text-ink-faint">{i + 1}.</span> {NOME_TIPO[b.tipo]}
                <span className="truncate font-normal text-ink-faint">{"headline" in b ? b.headline : "titolo" in b ? b.titolo : ""}</span>
              </button>
              <button type="button" className="btn-ghost btn-sm px-2" disabled={i === 0} onClick={() => cambia(sposta(blocks, i, -1))} aria-label="Sposta su">
                <ArrowUp size={14} />
              </button>
              <button type="button" className="btn-ghost btn-sm px-2" disabled={i === blocks.length - 1} onClick={() => cambia(sposta(blocks, i, 1))} aria-label="Sposta giù">
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm px-2 text-danger"
                onClick={() => {
                  if (window.confirm(`Eliminare il blocco «${NOME_TIPO[b.tipo]}»?`)) cambia(blocks.filter((x) => x.id !== b.id));
                }}
                aria-label="Elimina blocco"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {aperto === b.id && (
              <div className="border-t border-line p-3">
                <EditorBlocco b={b} onCambio={(nb) => cambia(blocks.map((x) => (x.id === b.id ? nb : x)))} />
              </div>
            )}
          </li>
        ))}
      </ol>

      <label className="card flex items-center gap-2 p-3">
        <Plus size={16} className="text-gold" />
        <select
          className="input"
          value=""
          aria-label="Aggiungi un blocco"
          onChange={(e) => {
            if (e.target.value) aggiungi(e.target.value as TipoBlocco);
          }}
        >
          <option value="">Aggiungi un blocco…</option>
          {TIPI_BLOCCO.map((t) => (
            <option key={t.tipo} value={t.tipo} disabled={t.tipo === "form" && blocks.some((x) => x.tipo === "form")}>
              {t.nome} — {t.descrizione}
            </option>
          ))}
        </select>
      </label>

      {problemi.length > 0 && (
        <section className="rounded-lg border border-warn/30 bg-warn/[.06] px-4 py-3 text-[13px]" aria-label="Da sistemare prima di pubblicare">
          <p className="mb-1 flex items-center gap-2 font-semibold text-warn">
            <TriangleAlert size={15} /> Da sistemare prima di pubblicare
          </p>
          <ul className="list-disc pl-5">
            {problemi.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  const anteprima = (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="text-[13px] font-semibold text-ink-soft">Anteprima della bozza</span>
        <div className="flex gap-1" role="group" aria-label="Dispositivo">
          <button type="button" className={clsx("btn-sm btn", device === "pc" ? "bg-navy text-white" : "btn-ghost")} onClick={() => setDevice("pc")} aria-pressed={device === "pc"}>
            <Monitor size={14} /> Computer
          </button>
          <button type="button" className={clsx("btn-sm btn", device === "tel" ? "bg-navy text-white" : "btn-ghost")} onClick={() => setDevice("tel")} aria-pressed={device === "tel"}>
            <Smartphone size={14} /> Telefono
          </button>
        </div>
      </div>
      <div className="flex justify-center bg-bg p-3">
        <iframe
          ref={frame}
          src={`/anteprima/${id}`}
          title="Anteprima della landing"
          onLoad={invia}
          className={clsx("rounded-md border border-line bg-white", device === "pc" ? "h-[78vh] w-full" : "h-[78vh] w-[390px] max-w-full")}
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-3 flex gap-1 lg:hidden" role="tablist">
        {(["modifica", "anteprima"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={vista === v} className={clsx("flex-1 rounded-md py-2 text-[14px] font-semibold", vista === v ? "bg-navy text-white" : "bg-surface text-ink-soft ring-1 ring-line")} onClick={() => setVista(v)}>
            {v === "modifica" ? "Modifica" : "Anteprima"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className={clsx(vista === "anteprima" && "hidden lg:block")}>{pannello}</div>
        <div className={clsx("lg:sticky lg:top-16 lg:self-start", vista === "modifica" && "hidden lg:block")}>{anteprima}</div>
      </div>

      <div className="sticky bottom-20 z-20 mt-4 lg:bottom-4">
        <div className="card flex flex-wrap items-center gap-3 p-3 shadow-pop">
          {esito ? (
            <p role="status" className={`flex items-center gap-1.5 text-[13px] font-medium ${esito.ok ? "text-ok" : "text-danger"}`}>
              {esito.ok ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />} {esito.msg}
            </p>
          ) : (
            sporco && <p className="text-[13px] text-ink-soft">Modifiche non salvate</p>
          )}
          <div className="ml-auto flex gap-2">
            <Link href={`/landing/${id}`} className="btn-ghost" onClick={(e) => sporco && !window.confirm("Ci sono modifiche non salvate. Uscire comunque?") && e.preventDefault()}>
              {stato === "PUBBLICATO" ? "Torna alla scheda" : "Scheda e pubblicazione"}
            </Link>
            <button type="button" className="btn-primary" onClick={salva} disabled={pending}>
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salva bozza
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
