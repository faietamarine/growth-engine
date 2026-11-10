"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Sparkles, Loader2, ArrowLeft, RefreshCw, Save } from "lucide-react";
import { generaLeadMagnet, salvaLeadMagnet, type GenLmState } from "../actions";
import { LmView } from "@/features/lead-magnets/lm-view";
import { LmIcon } from "@/features/lead-magnets/lm-icon";
import { Badge } from "@/components/ui/badge";
import type { LmTipo } from "@/lib/leadmagnets/catalog";

type TipoCard = Pick<LmTipo, "key" | "nome" | "descrizione" | "icona">;

export function Creator({ tipi, campagne, tipoIniziale, campagnaIniziale }: { tipi: TipoCard[]; campagne: { id: string; name: string }[]; tipoIniziale?: string; campagnaIniziale?: string }) {
  const [tipo, setTipo] = useState(tipoIniziale ?? "");
  const [tema, setTema] = useState("");
  const [campaignId, setCampaignId] = useState(campagnaIniziale ?? "");
  const [res, setRes] = useState<GenLmState | null>(null);
  const [titolo, setTitolo] = useState("");
  const [errore, setErrore] = useState<string | null>(null);
  const [gen, startGen] = useTransition();
  const [save, startSave] = useTransition();

  function genera() {
    setErrore(null);
    if (!tipo) {
      setErrore("Scegli un tipo di lead magnet.");
      return;
    }
    startGen(async () => {
      const r = await generaLeadMagnet({ tipo, tema, campaignId });
      setRes(r);
      if (r.ok) {
        setTitolo(r.title);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else setErrore(r.errore);
    });
  }

  function salva() {
    if (!res || !res.ok) return;
    setErrore(null);
    startSave(async () => {
      const r = await salvaLeadMagnet({ title: titolo, campaignId, content: { ...res.content, titolo: titolo } });
      if (r && !r.ok) setErrore(r.errore);
    });
  }

  if (res?.ok) {
    return (
      <div>
        <div className="card mb-4 p-4">
          <label htmlFor="titolo" className="label">
            Titolo del lead magnet
          </label>
          <input id="titolo" className="input text-[15px] font-semibold" value={titolo} onChange={(e) => setTitolo(e.target.value)} maxLength={160} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="info">{tipi.find((t) => t.key === tipo)?.nome}</Badge>
            <Badge tone={res.provider === "anthropic" ? "aqua" : "neutral"}>{res.provider === "anthropic" ? "Testi scritti con l'AI" : "Testi dal modello nautico"}</Badge>
            {campaignId && <span className="text-[12.5px] text-ink-soft">Campagna: {campagne.find((c) => c.id === campaignId)?.name}</span>}
          </div>
          {res.nota && <p className="mt-2 text-[12.5px] text-warn">{res.nota}</p>}
        </div>
        <LmView c={{ ...res.content, titolo }} />
        <div className="sticky bottom-20 z-20 mt-4 lg:bottom-4">
          <div className="card flex flex-wrap items-center gap-2 p-3 shadow-pop">
            <button type="button" className="btn-ghost" onClick={() => setRes(null)} disabled={save}>
              <ArrowLeft size={16} /> Cambia tipo o tema
            </button>
            <button type="button" className="btn-ghost" onClick={genera} disabled={gen || save}>
              {gen ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Rigenera
            </button>
            <div className="ml-auto flex flex-col items-end gap-1">
              <button type="button" className="btn-primary" onClick={salva} disabled={save || titolo.trim().length < 3}>
                {save ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salva come bozza
              </button>
              {errore && (
                <p role="alert" className="text-[12.5px] font-medium text-danger">
                  {errore}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        genera();
      }}
    >
      <fieldset className="card p-4">
        <legend className="sr-only">Tipo di lead magnet</legend>
        <p className="label mb-3">1. Che cosa offri in cambio del contatto?</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {tipi.map((t) => (
            <label
              key={t.key}
              className={clsx(
                "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-gold",
                tipo === t.key ? "border-navy bg-navy/[.06]" : "border-line hover:border-line-strong hover:bg-hover",
              )}
            >
              <input type="radio" name="tipo" value={t.key} checked={tipo === t.key} onChange={() => setTipo(t.key)} className="sr-only" />
              <span className={tipo === t.key ? "text-navy" : "text-gold"}>
                <LmIcon icona={t.icona} />
              </span>
              <span className="text-[13.5px] font-semibold">{t.nome}</span>
              <span className="text-[12px] leading-snug text-ink-soft">{t.descrizione}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="card grid grid-cols-[minmax(0,1fr)] gap-4 p-4 md:grid-cols-2">
        <div>
          <label htmlFor="tema" className="label">
            2. Su cosa? <span className="font-normal text-ink-faint">facoltativo</span>
          </label>
          <input id="tema" className="input" placeholder="Es. gommoni Joker Boat, barche a vela usate, tagliando" value={tema} onChange={(e) => setTema(e.target.value)} maxLength={120} />
        </div>
        <div>
          <label htmlFor="campaignId" className="label">
            3. Per quale campagna? <span className="font-normal text-ink-faint">facoltativo</span>
          </label>
          <select id="campaignId" className="input" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">Nessuna</option>
            {campagne.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errore && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
          {errore}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={gen}>
          {gen ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {gen ? "Preparo la bozza…" : "Genera la bozza"}
        </button>
      </div>
    </form>
  );
}
