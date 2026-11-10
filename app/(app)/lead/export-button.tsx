"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, CheckCircle2, TriangleAlert } from "lucide-react";

/** Scarica il file per Nautilus EVO senza lasciare la pagina, poi aggiorna l'elenco. */
export function ExportButton({ count }: { count: number }) {
  const router = useRouter();
  const [stato, setStato] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function esporta() {
    if (!window.confirm(`Consegnare ${count} lead a Nautilus EVO?\n\nVerrà scaricato il file da importare nel CRM e i lead risulteranno consegnati.`)) return;
    setPending(true);
    setStato(null);
    try {
      const res = await fetch("/api/export/nautilus", { method: "POST" });
      if (res.redirected || !res.headers.get("content-disposition")) {
        setStato({ tipo: "errore", testo: "Nessun lead da consegnare." });
      } else if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setStato({ tipo: "errore", testo: j.errore ?? "Esportazione non riuscita." });
      } else {
        const nome = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "lead-nautilus.json";
        const url = URL.createObjectURL(await res.blob());
        const a = Object.assign(document.createElement("a"), { href: url, download: nome });
        a.click();
        URL.revokeObjectURL(url);
        setStato({ tipo: "ok", testo: `${count} lead consegnati. File ${nome} scaricato: importalo in Nautilus EVO.` });
      }
    } catch {
      setStato({ tipo: "errore", testo: "Connessione non riuscita. Riprova." });
    } finally {
      setPending(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" onClick={esporta} disabled={pending || count === 0} className="btn-gold">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {count === 0 ? "Nessun lead da consegnare" : `Consegna ${count} lead a Nautilus EVO`}
      </button>
      {stato && (
        <p role="status" className={`flex items-center gap-1.5 text-[13px] font-medium ${stato.tipo === "ok" ? "text-ok" : "text-danger"}`}>
          {stato.tipo === "ok" ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />}
          {stato.testo}
        </p>
      )}
    </div>
  );
}
