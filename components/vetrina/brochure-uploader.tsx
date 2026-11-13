"use client";

import { useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";

/** Carica un PDF e ne salva l'id in un campo nascosto. */
export function BrochureUploader({ name, iniziale }: { name: string; iniziale: string }) {
  const [id, setId] = useState(iniziale);
  const [nome, setNome] = useState(iniziale ? "Brochure caricata" : "");
  const [carico, setCarico] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function carica(f: File | undefined) {
    if (!f) return;
    setErrore(null);
    setCarico(true);
    try {
      const fd = new FormData();
      fd.set("file", f);
      const r = await fetch("/api/media/pdf", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.errore ?? "Caricamento non riuscito");
      setId(j.id);
      setNome(j.nome || f.name);
    } catch (e) {
      setErrore((e as Error).message);
    }
    setCarico(false);
  }

  return (
    <div>
      <input type="hidden" name={name} value={id} />
      <div className="flex flex-wrap items-center gap-2">
        {id && (
          <span className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-medium">
            <FileText size={16} /> {nome}
            <a href={`/media/${id}`} target="_blank" rel="noopener" className="text-info underline">apri</a>
            <button type="button" aria-label="Togli la brochure" onClick={() => { setId(""); setNome(""); }} className="text-danger">
              <X size={15} />
            </button>
          </span>
        )}
        <label className="btn-ghost cursor-pointer">
          {carico ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {id ? "Sostituisci PDF" : "Carica PDF"}
          <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => { carica(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      {errore && <p role="alert" className="mt-2 text-[13px] font-medium text-danger">{errore}</p>}
    </div>
  );
}
