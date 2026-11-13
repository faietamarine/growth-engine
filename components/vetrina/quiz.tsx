"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { DOMANDE, ordinaPerProfilo, profiloQuiz, type Risposte } from "@/lib/vetrina/quiz";
import { dividiNome, inviaLead } from "./invia-lead";

export type MezzoQuiz = { id: string; titolo: string; categoria: string; condizione: string; inEvidenza: boolean; foto: string | null; dettaglio: string };

export function Quiz({ mezzi, versioneInformativa }: { mezzi: MezzoQuiz[]; versioneInformativa: string }) {
  const [r, setR] = useState<Risposte>({});
  const [stato, setStato] = useState<"idle" | "invio" | "ok">("idle");
  const [errore, setErrore] = useState<string | null>(null);
  const fatte = DOMANDE.filter((d) => r[d.id]).length;
  const completo = fatte === DOMANDE.length;
  const profilo = useMemo(() => profiloQuiz(r), [r]);
  const proposte = useMemo(() => (completo ? ordinaPerProfilo(mezzi, profilo).slice(0, 3) : []), [completo, mezzi, profilo]);

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrore(null);
    const fd = new FormData(e.currentTarget);
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    if (v("nominativo").length < 2 || v("telefono").length < 6) return setErrore("Inserisci nome e telefono.");
    if (fd.get("consensoPrivacy") !== "on") return setErrore("Serve il consenso per poterti inviare le proposte.");
    const { nome, cognome } = dividiNome(v("nominativo"));
    setStato("invio");
    const esito = await inviaLead({
      nome,
      cognome,
      telefono: v("telefono"),
      email: v("email"),
      interesse: `Quiz: ${r.uso ?? ""}`.slice(0, 200),
      tempistica: profilo.tempistica,
      risposte: { "Come la usa": r.uso ?? "", "Persone a bordo": r.persone ?? "", Quando: r.quando ?? "", "Mezzi proposti": proposte.map((p) => p.titolo).join(" / ").slice(0, 280) },
      fonte: "Sito vetrina: quiz Trova la tua barca",
      consensoPrivacy: true,
      consensoMarketing: fd.get("consensoMarketing") === "on",
      versioneInformativa,
      sito: v("sito"),
    });
    if (esito.ok) return setStato("ok");
    setStato("idle");
    setErrore(esito.errore);
  }

  return (
    <div className="vt-quiz">
      <div className="vt-barra" role="progressbar" aria-valuemin={0} aria-valuemax={DOMANDE.length} aria-valuenow={fatte} aria-label="Avanzamento del quiz">
        <div style={{ width: `${(fatte / DOMANDE.length) * 100}%` }} />
      </div>
      {DOMANDE.map((d, n) => (
        <div key={d.id} className="vt-box vt-reveal" style={{ animationDelay: `${n * 0.08}s` }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)" }}>
            Domanda {n + 1} di {DOMANDE.length}
          </div>
          <h2 style={{ fontSize: 21, margin: "6px 0 14px", color: "var(--blu-scuro)" }}>{d.titolo}</h2>
          <div className="vt-opzioni">
            {d.opzioni.map((o) => (
              <button key={o.v} type="button" className="vt-opz" aria-pressed={r[d.id] === o.v} onClick={() => setR((p) => ({ ...p, [d.id]: o.v }))}>
                {o.v}
              </button>
            ))}
          </div>
        </div>
      ))}

      {completo && (
        <section className="vt-risultato vt-reveal" aria-live="polite">
          <div style={{ color: "var(--giallo)", fontWeight: 800, fontSize: 12, letterSpacing: ".05em", textTransform: "uppercase" }}>Il tuo risultato</div>
          <h2 style={{ fontSize: 26, margin: "6px 0 6px" }}>{proposte.length ? `Abbiamo ${proposte.length === 1 ? "un mezzo" : `${proposte.length} mezzi`} per te` : "Ti consigliamo il mezzo giusto di persona"}</h2>
          <p style={{ margin: 0, color: "#DCE8FA" }}>{proposte.length ? "Scelti in base a come navighi e a quando ti serve." : "In questo momento non abbiamo un annuncio perfetto: lascia i tuoi dati e ti proponiamo le soluzioni disponibili o in arrivo."}</p>
          {proposte.length > 0 && (
            <div className="vt-ris-griglia">
              {proposte.map((p) => (
                <Link key={p.id} href={`/vetrina/mezzo/${p.id}`} className="vt-ris-card">
                  {p.foto && /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/media/${p.foto}`} alt="" loading="lazy" />}
                  <div>
                    <b>{p.titolo}</b>
                    <span>{p.dettaglio}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {stato === "ok" ? (
            <div role="status" className="vt-ok" style={{ marginTop: 16 }}>
              <CheckCircle2 size={32} />
              Perfetto! Ti contattiamo presto con le proposte.
            </div>
          ) : (
            <form onSubmit={invia} noValidate className="vt-form" style={{ marginTop: 18 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>Vuoi che te le mandiamo e ti aiutiamo a scegliere?</p>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
                <input type="text" name="nominativo" placeholder="Nome e cognome" aria-label="Nome e cognome" autoComplete="name" />
                <input type="tel" name="telefono" placeholder="Telefono" aria-label="Telefono" autoComplete="tel" inputMode="tel" />
              </div>
              <input type="email" name="email" placeholder="Email (facoltativa)" aria-label="Email" autoComplete="email" />
              <div className="vt-trappola" aria-hidden>
                <input type="text" name="sito" tabIndex={-1} autoComplete="off" />
              </div>
              <label className="vt-consenso" style={{ color: "#DCE8FA" }}>
                <input type="checkbox" name="consensoPrivacy" />
                <span>
                  Ho letto l&apos;<a href="/l/privacy" target="_blank" rel="noopener" style={{ color: "#fff" }}>informativa privacy</a> e acconsento a essere ricontattato.
                </span>
              </label>
              <label className="vt-consenso" style={{ color: "#DCE8FA" }}>
                <input type="checkbox" name="consensoMarketing" />
                <span>Voglio ricevere novità e offerte (facoltativo).</span>
              </label>
              {errore && (
                <p role="alert" className="vt-err" style={{ color: "#FFB4A9" }}>
                  {errore}
                </p>
              )}
              <button type="submit" className="vt-btn vt-btn-giallo" disabled={stato === "invio"}>
                {stato === "invio" && <Loader2 size={18} className="animate-spin" />} Mandami le proposte
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
