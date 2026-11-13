"use client";

import { useState } from "react";

/** Legge il file CSV nel browser e lo mette nel campo "csv" del modulo. */
export function CsvFile() {
  const [testo, setTesto] = useState("");
  const [nome, setNome] = useState("");
  return (
    <div className="space-y-2">
      <input type="hidden" name="csv" value={testo} />
      <input
        type="file"
        accept=".csv,text/csv,text/plain"
        className="input"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setNome(f.name);
          setTesto(await f.text());
        }}
      />
      {nome && <p className="text-[12px] text-ink-faint">{nome} · {testo.split(/\r?\n/).filter((r) => r.trim()).length - 1} righe lette</p>}
    </div>
  );
}
