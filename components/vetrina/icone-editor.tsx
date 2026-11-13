"use client";

import { useState } from "react";
import { ImagePlus, Loader2, RotateCcw } from "lucide-react";
import { caricaIcona } from "./comprimi";
import { IconaCategoria } from "./icone";
import type { CategoriaId } from "@/lib/vetrina/catalog";

/** Una tessera per categoria: anteprima su fondo blu, carica la tua icona o torna a quella predefinita. */
export function IconeEditor({ categorie, iniziali }: { categorie: { id: CategoriaId; nome: string }[]; iniziali: Record<string, string> }) {
  const [icone, setIcone] = useState<Record<string, string>>(iniziali);
  const [carico, setCarico] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function carica(id: string, f: File | undefined) {
    if (!f) return;
    setErrore(null);
    setCarico(id);
    try {
      const mid = await caricaIcona(f);
      setIcone((p) => ({ ...p, [id]: mid }));
    } catch (e) {
      setErrore((e as Error).message);
    }
    setCarico(null);
  }

  return (
    <div>
      <input type="hidden" name="icone" value={JSON.stringify(icone)} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categorie.map((c) => (
          <div key={c.id} className="rounded-xl border border-line bg-surface p-3">
            <div className="vt" style={{ position: "relative", aspectRatio: "5/3", borderRadius: 12, overflow: "hidden", background: "linear-gradient(160deg,#0B5ED7,#062B5F)", display: "grid", placeItems: "center" }}>
              <div style={{ width: "70%" }}>
                <IconaCategoria id={c.id} custom={icone[c.id]} />
              </div>
            </div>
            <p className="mt-2 text-sm font-semibold">{c.nome}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="btn-ghost cursor-pointer">
                {carico === c.id ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                {icone[c.id] ? "Cambia" : "Carica la tua"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { carica(c.id, e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {icone[c.id] && (
                <button type="button" className="btn-ghost" onClick={() => setIcone((p) => { const n = { ...p }; delete n[c.id]; return n; })}>
                  <RotateCcw size={15} /> Ripristina
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {errore && <p role="alert" className="mt-3 text-[13px] font-medium text-danger">{errore}</p>}
    </div>
  );
}
