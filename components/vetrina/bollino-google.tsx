import type { VetrinaSettings } from "@/features/vetrina/service";

/** "★★★★★ 4,9 su Google · 79 recensioni", con link alla scheda. Nascosto se i dati non sono impostati. */
export function BollinoGoogle({ v, chiaro }: { v: Pick<VetrinaSettings, "googleVoto" | "googleNumero" | "googleLink">; /** sul banner scuro */ chiaro?: boolean }) {
  if (!v.googleVoto || !v.googleNumero) return null;
  const voto = Number(v.googleVoto.replace(",", "."));
  const piene = Math.round(voto);
  const contenuto = (
    <>
      <span className="vt-g-logo" aria-hidden>
        G
      </span>
      <span className="vt-g-stelle" aria-hidden>
        {"★".repeat(piene)}
        <span style={{ opacity: 0.3 }}>{"★".repeat(5 - piene)}</span>
      </span>
      <b>{v.googleVoto}</b>
      <span>su Google · {v.googleNumero} recensioni</span>
    </>
  );
  const cls = `vt-bollino-g${chiaro ? " vt-bollino-g-chiaro" : ""}`;
  return v.googleLink ? (
    <a href={v.googleLink} target="_blank" rel="noopener" className={cls} aria-label={`Voto ${v.googleVoto} su 5 su Google, ${v.googleNumero} recensioni: leggile su Google`}>
      {contenuto}
    </a>
  ) : (
    <span className={cls} aria-label={`Voto ${v.googleVoto} su 5 su Google, ${v.googleNumero} recensioni`}>
      {contenuto}
    </span>
  );
}

/** Taglia una recensione lunga alla parola, con i puntini. */
export const accorcia = (t: string, max = 230) => (t.length <= max ? t : `${t.slice(0, max).replace(/\s+\S*$/, "")}…`);
