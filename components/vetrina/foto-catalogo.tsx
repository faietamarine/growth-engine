"use client";

import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { caricaFoto } from "./comprimi";
import { abbinaFotoAction } from "@/app/(app)/mezzi/strumenti/actions";

/** Carica molte foto insieme: il nome del file dice a quale modello appartengono. */
export function FotoCatalogo() {
  const [stato, setStato] = useState<"idle" | "carico" | "fatto">("idle");
  const [prog, setProg] = useState("");
  const [esito, setEsito] = useState<{ aggiornati: number; abbinate: number; senza: string[] } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  async function parti(files: FileList | null) {
    if (!files?.length) return;
    setErrore(null);
    setEsito(null);
    setStato("carico");
    const caricate: { nome: string; id: string }[] = [];
    const lista = [...files].slice(0, 300);
    for (let i = 0; i < lista.length; i++) {
      setProg(`${i + 1} di ${lista.length}`);
      try {
        caricate.push({ nome: lista[i].name, id: await caricaFoto(lista[i]) });
      } catch (e) {
        setErrore(`${lista[i].name}: ${(e as Error).message}`);
      }
    }
    const r = await abbinaFotoAction(caricate);
    if ("errore" in r && r.errore) setErrore(r.errore);
    else if ("aggiornati" in r) setEsito(r);
    setStato("fatto");
  }

  return (
    <div>
      <label className="btn-primary cursor-pointer">
        {stato === "carico" ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
        {stato === "carico" ? `Carico ${prog}…` : "Scegli le foto"}
        <input type="file" accept="image/*" multiple className="sr-only" disabled={stato === "carico"} onChange={(e) => { parti(e.target.files); e.target.value = ""; }} />
      </label>
      {errore && <p role="alert" className="mt-2 text-[13px] font-medium text-danger">{errore}</p>}
      {esito && (
        <div role="status" className="mt-3 rounded-md bg-ok/10 px-3 py-2 text-[13px]">
          <b>{esito.abbinate}</b> foto abbinate a <b>{esito.aggiornati}</b> mezzi.
          {esito.senza.length > 0 && (
            <p className="mt-1 text-danger">
              Senza abbinamento (eliminate): {esito.senza.slice(0, 12).join(", ")}
              {esito.senza.length > 12 ? ` … (+${esito.senza.length - 12})` : ""}. Controlla il nome del file e riprova.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
