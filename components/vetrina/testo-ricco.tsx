import { blocchi } from "@/lib/vetrina/contenuti";

/** Testo semplice scritto nell'app → paragrafi, sottotitoli ed elenchi (nessun HTML accettato dall'utente). */
export function TestoRicco({ testo }: { testo: string }) {
  return (
    <div className="vt-testo">
      {blocchi(testo).map((b, i) =>
        b.tipo === "titolo" ? (
          <h2 key={i}>{b.righe[0]}</h2>
        ) : b.tipo === "elenco" ? (
          <ul key={i}>
            {b.righe.map((r, j) => (
              <li key={j}>{r}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            {b.righe.map((r, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {r}
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
