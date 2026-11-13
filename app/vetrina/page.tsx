import Link from "next/link";
import { Search } from "lucide-react";
import { getVetrinaSettings, mezziPubblici } from "@/features/vetrina/service";
import { getSiteSettings } from "@/features/settings/service";
import { MARCHI } from "@/lib/brands/catalog";
import { CATEGORIE, SEZIONI_SITO } from "@/lib/vetrina/catalog";
import { LogoMarchio } from "@/components/brand/logo-marchio";
import { IconaCategoria } from "@/components/vetrina/icone";
import { CardMezzo } from "@/components/vetrina/card-mezzo";
import { FormAppuntamento } from "@/components/vetrina/form-appuntamento";

export const dynamic = "force-dynamic";

const ONDA = "M0 40 C 120 10, 240 70, 360 40 S 600 10, 720 40 S 960 70, 1080 40 S 1320 10, 1440 40 S 1680 70, 1800 40 S 2040 10, 2160 40 S 2400 70, 2520 40 S 2760 10, 2880 40 V80 H0Z";

export default async function VetrinaHome() {
  const [v, s, tutti] = await Promise.all([getVetrinaSettings(), getSiteSettings(), mezziPubblici()]);
  const per = (id: string) => tutti.filter((m) => m.condizione === id);
  const conteggio = (cat: string) => tutti.filter((m) => m.categoria === cat && m.stato === "PUBBLICATO").length;
  const fotoCategoria = (cat: string) => tutti.find((m) => m.categoria === cat && m.stato === "PUBBLICATO" && m.foto[0])?.foto[0];

  const sezione = (c: (typeof SEZIONI_SITO)[number]) => {
    const lista = per(c.id);
    return (
      <section key={c.id} className="vt-sez" id={c.slug}>
        <div className="vt-sez-testa">
          <div>
            <h2>{c.titolo}</h2>
            <p className="vt-sub">{c.sotto}</p>
          </div>
          {lista.length > 0 && (
            <Link href={`/vetrina/mezzi?condizione=${c.slug}`} className="vt-tutti">
              Vedi tutti →
            </Link>
          )}
        </div>
        {lista.length ? (
          <div className="vt-griglia">
            {lista.slice(0, 3).map((m) => (
              <CardMezzo key={m.id} m={m} />
            ))}
          </div>
        ) : (
          <div className="vt-vuoto">
            <b>Nuovi arrivi in preparazione</b>
            Stiamo aggiornando questa sezione. Intanto chiamaci al {v.telefono}: ti diciamo subito cosa abbiamo.
          </div>
        )}
      </section>
    );
  };

  return (
    <main>
      <section className="vt-hero">
        {v.bannerId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${v.bannerId}`} alt="" className="vt-hero-foto" fetchPriority="high" />
        )}
        <div className="vt-wrap vt-hero-inner">
          <div className="vt-dealer vt-reveal" aria-label="Dealer ufficiale dei marchi">
            <span className="vt-dealer-label">Dealer ufficiale</span>
            <ul className="vt-dealer-logo">
              {MARCHI.map((m) => (
                <li key={m.slug}>
                  <Link href={`/vetrina/marchi/${m.slug}`} className="vt-dealer-chip" aria-label={`Catalogo ${m.nome}`}>
                    <LogoMarchio m={m} style={{ height: 26, width: "auto", maxWidth: 110, objectFit: "contain", display: "block", fontSize: 11 }} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <h1 className="vt-reveal">La tua prossima barca, qui a Pescara.</h1>
          <p className="vt-sotto vt-reveal" style={{ animationDelay: ".1s" }}>
            Pronte consegne, modelli da ordinare e usato selezionato. Vieni a vederla: prenota la tua visita.
          </p>
          <div className="vt-reveal" style={{ animationDelay: ".2s", display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
            <Link href="#appuntamento" className="vt-btn vt-btn-giallo">
              Prenota la tua visita o il tuo appuntamento
            </Link>
            <Link href="/vetrina/quiz" className="vt-btn vt-btn-bianco">
              Trova la tua barca
            </Link>
          </div>
        </div>
        {!v.bannerId && (
          <div className="vt-onde" aria-hidden>
            <svg viewBox="0 0 2880 80" preserveAspectRatio="none">
              <path d={ONDA} fill="rgba(255,255,255,.07)" />
            </svg>
          </div>
        )}
      </section>

      <div className="vt-wrap vt-cerca">
        <form action="/vetrina/mezzi" method="get" aria-label="Cerca un mezzo">
          <label>
            <span>Dove cerchi</span>
            <select name="condizione" defaultValue="">
              <option value="">Tutto il sito</option>
              {SEZIONI_SITO.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.titolo}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Tipo di barca</span>
            <select name="categoria" defaultValue="">
              <option value="">Tutte</option>
              {CATEGORIE.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Marchio</span>
            <select name="marca" defaultValue="">
              <option value="">Tutti</option>
              {MARCHI.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.nome}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="vt-btn vt-btn-blu">
            <Search size={20} /> Cerca
          </button>
        </form>
      </div>

      <div className="vt-wrap">
        <nav className="vt-cat" aria-label="Cosa stai cercando">
          {CATEGORIE.map((c) => {
            const foto = fotoCategoria(c.id);
            const n = conteggio(c.id);
            return (
              <Link key={c.id} href={`/vetrina/mezzi?categoria=${c.id}`} className="vt-cat-t">
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/media/${foto}`} alt="" loading="lazy" />
                ) : (
                  <IconaCategoria id={c.id} />
                )}
                <span className="vt-cat-testo">
                  <b>{c.nome}</b>
                  <small>{n ? (n === 1 ? "1 disponibile" : `${n} disponibili`) : "Chiedi a noi"}</small>
                </span>
              </Link>
            );
          })}
        </nav>

        {SEZIONI_SITO.filter((c) => c.id === "PRONTA_CONSEGNA").map((c) => sezione(c))}

        <section className="vt-sez" id="marchi">
          <div className="vt-sez-testa">
            <div>
              <h2>I nostri marchi</h2>
              <p className="vt-sub">Dealer ufficiale. Tocca un marchio: modelli a catalogo, pronte consegne e usato.</p>
            </div>
          </div>
          <div className="vt-marchi">
            {MARCHI.map((m) => (
              <Link key={m.slug} href={`/vetrina/marchi/${m.slug}`} className="vt-marchio" aria-label={`Catalogo ${m.nome}`}>
                <LogoMarchio m={m} style={{ maxHeight: 50, width: "auto", maxWidth: "100%", objectFit: "contain" }} />
              </Link>
            ))}
          </div>
        </section>

        {SEZIONI_SITO.filter((c) => c.id === "USATO").map((c) => sezione(c))}

        <section className="vt-banda" aria-labelledby="t-quiz">
          <div>
            <h2 id="t-quiz">Non sai quale scegliere?</h2>
            <p>Rispondi a 3 domande: ti proponiamo i mezzi più adatti a come navighi. Due minuti, nessun obbligo.</p>
          </div>
          <Link href="/vetrina/quiz" className="vt-btn vt-btn-giallo">
            Trova la tua barca
          </Link>
        </section>

        <section id="appuntamento" className="vt-sez" style={{ paddingBottom: 0 }}>
          <div className="vt-box" style={{ maxWidth: 640, margin: "0 auto" }}>
            <h2 style={{ fontSize: 28, color: "var(--blu-scuro)" }}>Prenota la tua visita o il tuo appuntamento</h2>
            <p style={{ color: "var(--muted)", margin: "8px 0 18px" }}>Lasciaci un recapito: ti richiamiamo per fissare giorno e ora. Ti aspettiamo in {v.indirizzo}.</p>
            <FormAppuntamento versioneInformativa={s.versioneInformativa} telefono={v.telefono} />
          </div>
        </section>
      </div>
    </main>
  );
}
