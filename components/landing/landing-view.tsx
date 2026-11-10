/* Aspetto pubblico delle landing: lo stesso componente serve la pagina online e l'anteprima nell'editor.
   Nessuno stato proprio: si può rendere lato server o lato browser. */
import { Phone } from "lucide-react";
import type { Blocco } from "@/types/landing";
import { embedVideo } from "@/lib/landing/blocks";
import { LeadForm, type FormContext } from "./lead-form";
import { PreferenzeCookieLink } from "./consent";

export type FooterData = { nomeCommerciale: string; ragioneSociale: string; indirizzo: string; partitaIva: string; telefono: string };

const contenitore = "mx-auto w-full max-w-5xl px-5";

function Pulsante({ testo }: { testo: string }) {
  return (
    <a href="#richiesta" className="inline-flex items-center justify-center rounded-lg bg-[#B8892F] px-6 py-3.5 text-[16px] font-bold text-[#0C1A30] shadow-[0_6px_16px_rgba(184,137,47,.35)] transition-colors hover:bg-[#E6C877]">
      {testo}
    </a>
  );
}

function Hero({ b }: { b: Extract<Blocco, { tipo: "hero" }> }) {
  return (
    <section className="relative overflow-hidden bg-[#0C1A30] text-white">
      {b.immagine ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.immagine} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" fetchPriority="high" />
      ) : (
        <svg aria-hidden className="absolute bottom-0 left-0 w-full text-[#1F3A66]" viewBox="0 0 1440 160" preserveAspectRatio="none">
          <path fill="currentColor" d="M0 96c120 24 240 40 360 32s240-48 360-48 240 40 360 48 240-16 360-32v64H0z" />
        </svg>
      )}
      <div className={`${contenitore} relative py-16 sm:py-24`}>
        <h1 className="max-w-3xl text-[32px] font-bold leading-[1.1] tracking-tight sm:text-[48px]">{b.headline}</h1>
        {b.sottotitolo && <p className="mt-4 max-w-2xl text-[18px] leading-relaxed text-white/85 sm:text-[20px]">{b.sottotitolo}</p>}
        <div className="mt-8">
          <Pulsante testo={b.cta} />
        </div>
      </div>
    </section>
  );
}

function Sezione({ titolo, children, chiara = false }: { titolo?: string; children: React.ReactNode; chiara?: boolean }) {
  return (
    <section className={chiara ? "bg-[#EEF0F3] py-12 sm:py-16" : "bg-white py-12 sm:py-16"}>
      <div className={contenitore}>
        {titolo && <h2 className="mb-6 text-[26px] font-bold leading-tight text-[#0F2340] sm:text-[32px]">{titolo}</h2>}
        {children}
      </div>
    </section>
  );
}

export function LandingView({ blocks, form, footer }: { blocks: Blocco[]; form: FormContext; footer: FooterData }) {
  return (
    <div className="min-h-dvh bg-white font-sans text-[#1A1F29] antialiased">
      <header className="bg-[#0C1A30]">
        <div className={`${contenitore} flex items-center justify-between py-3`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/faieta-marine.png" alt={footer.nomeCommerciale || "Faieta Marine"} width={84} height={42} className="h-auto w-[84px]" />
          {footer.telefono && (
            <a href={`tel:${footer.telefono.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <Phone size={16} /> {footer.telefono}
            </a>
          )}
        </div>
      </header>

      {blocks.map((b, i) => {
        switch (b.tipo) {
          case "hero":
            return <Hero key={b.id} b={b} />;
          case "punti":
            return (
              <Sezione key={b.id} titolo={b.titolo} chiara={i % 2 === 1}>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {b.voci.map((v, j) => (
                    <li key={j} className="flex gap-3 rounded-xl bg-white p-4 text-[16px] shadow-[0_1px_3px_rgba(10,20,40,.08)]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#B8892F] text-[13px] font-bold text-[#0C1A30]">✓</span>
                      {v}
                    </li>
                  ))}
                </ul>
              </Sezione>
            );
          case "testo":
            return (
              <Sezione key={b.id} titolo={b.titolo || undefined} chiara={i % 2 === 1}>
                <p className="max-w-3xl whitespace-pre-line text-[17px] leading-relaxed text-[#3F4857]">{b.testo}</p>
              </Sezione>
            );
          case "immagine":
            return b.url ? (
              <figure key={b.id} className="bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt={b.didascalia} loading="lazy" className="max-h-[560px] w-full object-cover" />
                {b.didascalia && <figcaption className={`${contenitore} py-2 text-[13px] text-[#647184]`}>{b.didascalia}</figcaption>}
              </figure>
            ) : null;
          case "video": {
            const src = embedVideo(b.url);
            return src ? (
              <Sezione key={b.id} titolo={b.titolo || undefined} chiara={i % 2 === 1}>
                <div className="aspect-video overflow-hidden rounded-xl bg-black">
                  <iframe src={src} title={b.titolo || "Video"} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" className="h-full w-full" />
                </div>
              </Sezione>
            ) : null;
          }
          case "form":
            return (
              <section key={b.id} id="richiesta" className="scroll-mt-4 bg-[#EEF0F3] py-12 sm:py-16">
                <div className="mx-auto w-full max-w-xl px-5">
                  <div className="rounded-2xl bg-white p-6 shadow-[0_12px_32px_rgba(10,20,40,.10)] sm:p-8">
                    <h2 className="text-[24px] font-bold leading-tight text-[#0F2340]">{b.titolo}</h2>
                    {b.sottotitolo && <p className="mb-5 mt-1 text-[15px] text-[#647184]">{b.sottotitolo}</p>}
                    <LeadForm b={b} ctx={form} />
                  </div>
                </div>
              </section>
            );
          case "testimonianze":
            return b.voci.length ? (
              <Sezione key={b.id} titolo={b.titolo} chiara={i % 2 === 1}>
                <ul className="grid gap-4 md:grid-cols-2">
                  {b.voci.map((v, j) => (
                    <li key={j} className="rounded-xl border border-[#E1E4E9] bg-white p-5">
                      <p className="text-[16px] leading-relaxed">«{v.testo}»</p>
                      <p className="mt-3 text-[14px] font-semibold text-[#0F2340]">— {v.autore}</p>
                    </li>
                  ))}
                </ul>
              </Sezione>
            ) : null;
          case "faq":
            return b.voci.length ? (
              <Sezione key={b.id} titolo={b.titolo} chiara={i % 2 === 1}>
                <div className="divide-y divide-[#E1E4E9] rounded-xl border border-[#E1E4E9] bg-white">
                  {b.voci.map((f, j) => (
                    <details key={j} className="group px-5 py-4">
                      <summary className="cursor-pointer list-none text-[16px] font-semibold text-[#0F2340] marker:hidden">
                        <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
                        {f.domanda}
                      </summary>
                      <p className="mt-2 text-[15px] leading-relaxed text-[#3F4857]">{f.risposta}</p>
                    </details>
                  ))}
                </div>
              </Sezione>
            ) : null;
          case "cta":
            return (
              <section key={b.id} className="bg-[#0F2340] py-12 text-center text-white">
                <div className={contenitore}>
                  <h2 className="text-[26px] font-bold">{b.titolo}</h2>
                  {b.testo && <p className="mx-auto mt-2 max-w-2xl text-[16px] text-white/80">{b.testo}</p>}
                  <div className="mt-6">
                    <Pulsante testo={b.cta} />
                  </div>
                </div>
              </section>
            );
        }
      })}

      <footer className="bg-[#0C1A30] py-8 text-[13px] text-white/70">
        <div className={`${contenitore} space-y-1`}>
          <p className="font-semibold text-white">{footer.nomeCommerciale}</p>
          <p>
            {footer.ragioneSociale}
            {footer.indirizzo && ` · ${footer.indirizzo}`}
            {footer.partitaIva && ` · P. IVA ${footer.partitaIva}`}
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
            <a href="/l/privacy" className="underline">
              Informativa privacy
            </a>
            <PreferenzeCookieLink />
          </p>
        </div>
      </footer>
    </div>
  );
}
