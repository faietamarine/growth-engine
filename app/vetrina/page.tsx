import Link from "next/link";
import { BadgeCheck, Repeat, Search, Warehouse, Wrench } from "lucide-react";
import { BarraPrenota } from "@/components/vetrina/barra-prenota";
import { BollinoGoogle, accorcia } from "@/components/vetrina/bollino-google";
import { testimonialsPubblici, getVetrinaSettings, mezziPubblici } from "@/features/vetrina/service";
import { getSiteSettings } from "@/features/settings/service";
import { MARCHI } from "@/lib/brands/catalog";
import { CATEGORIE, SEZIONI_SITO, euro, offerta } from "@/lib/vetrina/catalog";
import { oggiRoma } from "@/lib/vetrina/promo";
import { NastroPronte, type VoceNastro } from "@/components/vetrina/nastro-pronte";
import { LogoMarchio } from "@/components/brand/logo-marchio";
import { IconaCategoria } from "@/components/vetrina/icone";
import { CardMezzo } from "@/components/vetrina/card-mezzo";
import { FormAppuntamento } from "@/components/vetrina/form-appuntamento";
import { eventiInArrivo, iscrittiPerEvento, postPubblici } from "@/features/vetrina/contenuti";
import { CardEvento, CardPost } from "@/components/vetrina/card-contenuti";
import { HERO_DEFAULT } from "@/lib/vetrina/contenuti";

export const dynamic = "force-dynamic";

const ONDA = "M0 40 C 120 10, 240 70, 360 40 S 600 10, 720 40 S 960 70, 1080 40 S 1320 10, 1440 40 S 1680 70, 1800 40 S 2040 10, 2160 40 S 2400 70, 2520 40 S 2760 10, 2880 40 V80 H0Z";

export default async function VetrinaHome() {
  const [v, s, tutti, recensioni, consegne, eventi, articoli, iscritti] = await Promise.all([getVetrinaSettings(), getSiteSettings(), mezziPubblici(), testimonialsPubblici("RECENSIONE", 6), testimonialsPubblici("CONSEGNA", 6), eventiInArrivo(3), postPubblici(3), iscrittiPerEvento()]);
  const per = (id: string) => tutti.filter((m) => m.condizione === id);
  const conteggio = (cat: string) => tutti.filter((m) => m.categoria === cat && m.stato === "PUBBLICATO").length;
  const oggi = oggiRoma();
  // Sopra il modulo: due recensioni Google di media lunghezza, dove il cliente decide se lasciare i dati.
  const sopraModulo = v.googleVoto
    ? recensioni
        .filter((r) => r.fonte === "GOOGLE" && r.testo.length >= 90 && r.testo.length <= 340)
        .sort((a, b) => b.testo.length - a.testo.length)
        .slice(0, 2)
    : [];
  // Nel banner: le pronte consegne pubblicate, prima quelle in evidenza e in promo.
  const nastro: VoceNastro[] = tutti
    .filter((m) => m.condizione === "PRONTA_CONSEGNA" && m.stato === "PUBBLICATO")
    .map((m) => ({ m, o: offerta(m, oggi) }))
    .sort((a, b) => Number(b.m.inEvidenza) - Number(a.m.inEvidenza) || Number(!!b.o) - Number(!!a.o))
    .slice(0, 12)
    .map(({ m, o }) => ({
      id: m.id,
      marca: MARCHI.find((x) => x.slug === m.marca)?.nome ?? m.marca,
      modello: m.modello,
      foto: m.foto[0] ?? null,
      prezzo: m.prezzo == null ? "Prezzo su richiesta" : euro(m.prezzo),
      listino: o?.listino ? euro(o.listino) : null,
      risparmio: o?.listino ? euro(o.risparmio) : null,
      etichetta: o ? o.etichetta || (o.listino ? `-${o.percentuale}%` : "") : "",
    }));
  const fotoCategoria = (cat: string) => tutti.find((m) => m.categoria === cat && m.stato === "PUBBLICATO" && m.foto[0])?.foto[0];

  const sezione = (c: (typeof SEZIONI_SITO)[number]) => {
    const lista = per(c.id);
    if (!lista.length) return null; // in home niente sezioni vuote: danno l'idea di un'azienda ferma
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
        <div className={`vt-wrap vt-hero-inner${nastro.length ? " vt-hero-2col" : ""}`}>
          <div className="vt-hero-testo">
            <h1 className="vt-reveal vt-o-tit">
              <span className="vt-hero-marca">{HERO_DEFAULT.titolo}</span> {v.heroFrase || HERO_DEFAULT.frase}
            </h1>
              <div className="vt-dealer vt-reveal vt-o-dealer" aria-label="Dealer ufficiale dei marchi" style={{ animationDelay: ".05s" }}>
                <span className="vt-dealer-label">Dealer ufficiale</span>
                <ul className="vt-dealer-logo">
                  {MARCHI.map((m) => (
                    <li key={m.slug}>
                      <Link href={`/vetrina/marchi/${m.slug}`} className="vt-dealer-chip" aria-label={`Catalogo ${m.nome}`}>
                        <LogoMarchio m={m} style={{ height: 22, width: "auto", maxWidth: 96, objectFit: "contain", display: "block", fontSize: 11 }} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            <p className="vt-sotto vt-reveal vt-o-sotto" style={{ animationDelay: ".1s" }}>
              {v.heroSotto || HERO_DEFAULT.sotto}
            </p>
            {v.googleVoto && (
              <div className="vt-hero-prova vt-reveal vt-o-prova" style={{ animationDelay: ".15s" }}>
                <BollinoGoogle v={v} chiaro />
              </div>
            )}
            <div className="vt-hero-cta vt-reveal vt-o-cta" style={{ animationDelay: ".2s" }}>
              <Link href="#appuntamento" className="vt-btn vt-btn-giallo">
                Prenota la tua visita
              </Link>
              <Link href="/vetrina/quiz" className="vt-btn vt-btn-bianco">
                Trova il tuo mezzo
              </Link>
            </div>
          </div>
          {nastro.length > 0 && (
            <div className="vt-hero-nastro vt-reveal vt-o-nastro" style={{ animationDelay: ".15s" }}>
              <NastroPronte voci={nastro} />
            </div>
          )}
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
                {foto && !v.icone?.[c.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/media/${foto}`} alt="" loading="lazy" />
                ) : (
                  <IconaCategoria id={c.id} custom={v.icone?.[c.id]} />
                )}
                <span className="vt-cat-testo">
                  <b>{c.nome}</b>
                  <small>{n ? (n === 1 ? "1 disponibile" : `${n} disponibili`) : "Chiedi a noi"}</small>
                </span>
              </Link>
            );
          })}
        </nav>

        <ul className="vt-usp" aria-label="Perché Faieta Marine">
          <li>
            <BadgeCheck size={26} aria-hidden />
            <span>
              <b>Dealer ufficiale</b>
              {MARCHI.length} marchi, garanzia della casa
            </span>
          </li>
          <li>
            <Wrench size={26} aria-hidden />
            <span>
              <b>Officina e ricambi</b>
              Tecnici e assistenza in sede
            </span>
          </li>
          <li>
            <Warehouse size={26} aria-hidden />
            <span>
              <b>Rimessaggio</b>
              Custodia e preparazione stagionale
            </span>
          </li>
          <li>
            <Repeat size={26} aria-hidden />
            <span>
              <b>Permuta dell&apos;usato</b>
              Valutiamo il tuo mezzo
            </span>
          </li>
        </ul>

        {SEZIONI_SITO.filter((c) => c.id === "PRONTA_CONSEGNA").map((c) => sezione(c))}

        <section className="vt-sez" id="marchi">
          <div className="vt-sez-testa">
            <div>
              <h2>Catalogo da ordinare</h2>
              <p className="vt-sub">Non lo trovi in pronta consegna? Lo ordiniamo per te, con il motore e l&apos;allestimento che vuoi. Scegli il marchio.</p>
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

        {eventi.length > 0 && (
          <section className="vt-sez" id="eventi" aria-labelledby="t-eventi">
            <div className="vt-sez-testa">
              <div>
                <h2 id="t-eventi">Eventi e prove in mare</h2>
                <p className="vt-sub">Provala in acqua prima di sceglierla. I posti sono limitati.</p>
              </div>
              <Link href="/vetrina/eventi" className="vt-tutti">
                Tutti gli eventi →
              </Link>
            </div>
            <div className="vt-griglia">
              {eventi.map((e) => (
                <CardEvento key={e.id} e={e} liberi={e.posti ? Math.max(0, e.posti - (iscritti[e.id] ?? 0)) : null} />
              ))}
            </div>
          </section>
        )}

        <section className="vt-banda" aria-labelledby="t-quiz">
          <div>
            <h2 id="t-quiz">Non sai quale scegliere?</h2>
            <p>Rispondi a 3 domande: ti proponiamo i mezzi più adatti a come navighi. Due minuti, nessun obbligo.</p>
          </div>
          <Link href="/vetrina/quiz" className="vt-btn vt-btn-giallo">
            Trova la tua barca
          </Link>
        </section>

        {recensioni.length > 0 && (
          <section className="vt-sez" aria-labelledby="t-rec">
            <div className="vt-sez-testa">
              <div>
                <h2 id="t-rec">Dicono di noi</h2>
                <p className="vt-sub">Le parole di chi ha scelto Faieta Marine.</p>
              </div>
              <BollinoGoogle v={v} />
            </div>
            <div className="vt-griglia">
              {recensioni.map((r) => (
                <figure key={r.id} className="vt-box" style={{ margin: 0 }}>
                  {r.fonte === "GOOGLE" ? (
                    <span className="vt-rec-google">
                      <span className="vt-g-logo" aria-hidden>
                        G
                      </span>
                      Recensione su Google
                    </span>
                  ) : (
                    <div aria-label={`${r.stelle} stelle su 5`} style={{ color: "var(--giallo-s, #E0A400)", letterSpacing: 2 }}>
                      {"★".repeat(r.stelle)}
                    </div>
                  )}
                  <blockquote style={{ margin: "8px 0", fontSize: 15 }}>&ldquo;{accorcia(r.testo, 320)}&rdquo;</blockquote>
                  <figcaption style={{ fontSize: 13, color: "var(--muted)" }}>
                    <b>{r.nome}</b>
                    {r.mezzo ? ` · ${r.mezzo}` : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {consegne.length > 0 && (
          <section className="vt-sez" aria-labelledby="t-cons">
            <div className="vt-sez-testa">
              <div>
                <h2 id="t-cons">Consegne</h2>
                <p>Alcuni dei mezzi consegnati ai nostri clienti.</p>
              </div>
            </div>
            <div className="vt-griglia">
              {consegne.map((c) => (
                <figure key={c.id} className="vt-box" style={{ margin: 0, padding: 0, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/media/${c.foto}`} alt={c.mezzo ? `Consegna ${c.mezzo}` : "Consegna"} loading="lazy" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                  <figcaption style={{ padding: "10px 14px", fontSize: 13.5 }}>
                    <b>{c.nome}</b>
                    {c.mezzo ? ` · ${c.mezzo}` : ""}
                    {c.testo && <span style={{ display: "block", color: "var(--muted)" }}>{c.testo}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {articoli.length > 0 && (
          <section className="vt-sez" aria-labelledby="t-blog">
            <div className="vt-sez-testa">
              <div>
                <h2 id="t-blog">Dal blog</h2>
                <p className="vt-sub">Consigli pratici da chi vende e ripara mezzi nautici ogni giorno.</p>
              </div>
              <Link href="/vetrina/blog" className="vt-tutti">
                Tutti gli articoli →
              </Link>
            </div>
            <div className="vt-griglia">
              {articoli.map((p) => (
                <CardPost key={p.id} p={p} />
              ))}
            </div>
          </section>
        )}

        <section className="vt-banda" aria-labelledby="t-valuta">
          <div>
            <h2 id="t-valuta">Hai una barca da cambiare?</h2>
            <p>Permuta o vendita: descrivi il tuo mezzo e ti facciamo una valutazione senza impegno.</p>
          </div>
          <Link href="/vetrina/valuta" className="vt-btn vt-btn-giallo">
            Valuta la tua barca
          </Link>
        </section>

        <section id="appuntamento" className="vt-sez" style={{ paddingBottom: 0 }}>
          <div className="vt-box" style={{ maxWidth: 640, margin: "0 auto" }}>
            <h2 style={{ fontSize: 28, color: "var(--blu-scuro)" }}>Prenota la tua visita o il tuo appuntamento</h2>
            <p style={{ color: "var(--muted)", margin: "8px 0 18px" }}>Lasciaci un recapito: ti richiamiamo per fissare giorno e ora. Ti aspettiamo in {v.indirizzo}.</p>
            {sopraModulo.length > 0 && (
              <div className="vt-rec-mini">
                <BollinoGoogle v={v} />
                {sopraModulo.map((r) => (
                  <figure key={r.id}>
                    <blockquote>&ldquo;{accorcia(r.testo, 200)}&rdquo;</blockquote>
                    <figcaption>
                      <b>{r.nome}</b> · Recensione su Google
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
            <FormAppuntamento versioneInformativa={s.versioneInformativa} telefono={v.telefono} />
          </div>
        </section>
      </div>
      <BarraPrenota />
    </main>
  );
}
