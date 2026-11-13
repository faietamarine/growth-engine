"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, X } from "lucide-react";
import { caricaFoto } from "./comprimi";

/** Elenco foto di un mezzo: carica, ordina (la prima è la copertina) ed elimina. Scrive gli id in un campo nascosto. */
export function FotoUploader({ name, iniziali, max = 12, singola = false }: { name: string; iniziali: string[]; max?: number; singola?: boolean }) {
  const [foto, setFoto] = useState<string[]>(iniziali);
  const [carico, setCarico] = useState(0);
  const [errore, setErrore] = useState<string | null>(null);

  async function aggiungi(files: FileList | null) {
    if (!files?.length) return;
    setErrore(null);
    const lista = [...files].slice(0, Math.max(0, max - foto.length));
    if (!lista.length) return setErrore(`Massimo ${max} foto.`);
    setCarico(lista.length);
    const nuove: string[] = [];
    for (const f of lista) {
      try {
        nuove.push(await caricaFoto(f));
      } catch (e) {
        setErrore((e as Error).message);
      }
      setCarico((n) => n - 1);
    }
    setFoto((p) => (singola ? nuove.slice(-1) : [...p, ...nuove]));
  }
  const sposta = (i: number, d: number) =>
    setFoto((p) => {
      const j = i + d;
      if (j < 0 || j >= p.length) return p;
      const n = [...p];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(foto)} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {foto.map((id, i) => (
          <div key={id} className="relative overflow-hidden rounded-lg border border-line bg-surface">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/media/${id}`} alt={`Foto ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
            {i === 0 && !singola && (
              <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">
                <Star size={11} /> Copertina
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5">
              <span className="flex gap-1">
                {!singola && (
                  <>
                    <button type="button" onClick={() => sposta(i, -1)} disabled={i === 0} aria-label="Sposta prima" className="rounded bg-white/90 p-1.5 disabled:opacity-40">
                      <ArrowLeft size={14} />
                    </button>
                    <button type="button" onClick={() => sposta(i, 1)} disabled={i === foto.length - 1} aria-label="Sposta dopo" className="rounded bg-white/90 p-1.5 disabled:opacity-40">
                      <ArrowRight size={14} />
                    </button>
                  </>
                )}
              </span>
              <button type="button" onClick={() => setFoto((p) => p.filter((x) => x !== id))} aria-label="Elimina foto" className="rounded bg-white/90 p-1.5 text-danger">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
        {(singola ? foto.length === 0 || true : foto.length < max) && (
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-[13px] font-medium text-ink-soft hover:border-ink-soft">
            {carico > 0 ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
            {carico > 0 ? `Carico… (${carico})` : singola && foto.length ? "Sostituisci" : "Aggiungi foto"}
            <input type="file" accept="image/*" multiple={!singola} className="sr-only" onChange={(e) => { aggiungi(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {errore && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-danger">
          {errore}
        </p>
      )}
    </div>
  );
}
