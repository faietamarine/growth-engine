import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, Pencil, Trash2, ExternalLink, Megaphone, Workflow, Magnet, Share2, FlaskConical, BarChart3, TriangleAlert, Upload, Download } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { getLanding } from "@/features/landing/service";
import { allowedTransitions } from "@/lib/campaigns/status";
import { confrontaVarianti, ELEMENTI_AB } from "@/lib/landing/ab";
import { problemiPubblicazione } from "@/lib/landing/blocks";
import { urlPubblico } from "@/lib/landing/url";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { CopyButton } from "@/components/ui/copy-button";
import { REPARTO_UI, WORK_STATUS_UI, dataBreve } from "@/lib/labels";
import { UtmLinks } from "../../campagne/[id]/utm-links";
import { applicaB, avviaAb, cambiaStatoLanding, eliminaLanding, fermaAb, ripubblica } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = /^[0-9a-f-]{36}$/i.test(id) ? await getLanding(id) : null;
  return { title: d?.landing.title ?? "Landing" };
}

const pct = (n: number) => `${(n * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;

export default async function LandingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; errore?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await getLanding(id);
  if (!d) notFound();
  const sp = await searchParams;
  const { landing: l, campaign, funnel, leadMagnet, stats } = d;
  const online = l.status === "PUBBLICATO";
  const giaOnline = l.version > 0;
  const url = urlPubblico(l.slug);
  const pubblica = can(user.role, "landing:pubblica");
  const scrivi = can(user.role, "contenuti:scrivi");
  const modificheDaPubblicare = giaOnline && JSON.stringify(l.blocks) !== JSON.stringify(l.publishedBlocks);
  const problemi = problemiPubblicazione(l.blocks);
  const qr = giaOnline ? await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0C1A30", light: "#FFFFFF" } }) : null;
  const visite = l.visits + l.visitsB;
  const lead = stats.leadA + stats.leadB;
  const ab = l.abTest?.attivo ? l.abTest : null;
  const risultato = ab ? confrontaVarianti(l.visits, stats.leadA, l.visitsB, stats.leadB) : null;

  return (
    <>
      <Link href="/landing" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Landing page
      </Link>
      <Flash msg={sp.msg} />
      {sp.errore && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-md bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {sp.errore.slice(0, 400)}
        </p>
      )}

      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={online ? "ok" : WORK_STATUS_UI[l.status].tone}>{online ? "Online" : WORK_STATUS_UI[l.status].label}</Badge>
          <Badge tone={REPARTO_UI[l.reparto].tone}>Lead in Nautilus EVO: {REPARTO_UI[l.reparto].label}</Badge>
          {giaOnline && <span className="text-[12.5px] text-ink-faint">versione {l.version} · pubblicata il {l.publishedAt ? dataBreve(l.publishedAt) : "—"}</span>}
        </div>
        <h1 className="mt-2 font-display text-[22px] font-semibold leading-tight lg:text-[26px]">{l.title}</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {campaign && (
            <Link href={`/campagne/${campaign.id}`} className="inline-flex items-center gap-1.5 font-semibold text-navy hover:underline">
              <Megaphone size={14} /> {campaign.name}
            </Link>
          )}
          {funnel && (
            <Link href={`/funnel/${funnel.id}`} className="inline-flex items-center gap-1.5 font-semibold text-navy hover:underline">
              <Workflow size={14} /> {funnel.name}
            </Link>
          )}
          {leadMagnet && (
            <Link href={`/lead-magnet/${leadMagnet.id}`} className="inline-flex items-center gap-1.5 font-semibold text-navy hover:underline">
              <Magnet size={14} /> {leadMagnet.title}
            </Link>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {allowedTransitions(l.status, user.role, "landing").map((t) => (
            <form key={t.to} action={cambiaStatoLanding}>
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="to" value={t.to} />
              <SubmitButton className={t.primaria ? "btn-primary" : "btn-ghost"} confirm={t.conferma}>
                {t.label}
              </SubmitButton>
            </form>
          ))}
          {pubblica && modificheDaPubblicare && (l.status === "PUBBLICATO" || l.status === "PAUSA") && (
            <form action={ripubblica}>
              <input type="hidden" name="id" value={l.id} />
              <SubmitButton className="btn-gold" confirm="Pubblicare le modifiche della bozza? La pagina online verrà aggiornata subito.">
                <Upload size={15} /> Pubblica le modifiche
              </SubmitButton>
            </form>
          )}
          {scrivi && l.status !== "CONCLUSO" && (
            <Link href={`/landing/${l.id}/modifica`} className="btn-ghost">
              <Pencil size={15} /> Apri l&apos;editor
            </Link>
          )}
          {online && (
            <a href={url} target="_blank" rel="noopener" className="btn-ghost">
              <ExternalLink size={15} /> Vedi online
            </a>
          )}
          {scrivi && !giaOnline && (
            <form action={eliminaLanding}>
              <input type="hidden" name="id" value={l.id} />
              <SubmitButton className="btn-ghost text-danger" confirm="Eliminare definitivamente questa pagina?">
                <Trash2 size={15} /> Elimina
              </SubmitButton>
            </form>
          )}
        </div>
        {modificheDaPubblicare && <p className="mt-2 text-[12.5px] text-warn">La bozza contiene modifiche non ancora online.</p>}
        {problemi.length > 0 && l.status !== "CONCLUSO" && <p className="mt-2 text-[12.5px] text-warn">Prima di pubblicare: {problemi.join(" ")}</p>}
      </header>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Risultati">
        {[
          { l: "Visite", v: visite, h: "una per visitatore e sessione" },
          { l: "Lead", v: lead, h: `${stats.qualificati} qualificati` },
          { l: "Conversione", v: visite ? pct(lead / visite) : "—", h: "lead su visite" },
          { l: "Online da", v: l.publishedAt ? dataBreve(l.publishedAt) : "—", h: giaOnline ? `versione ${l.version}` : "mai pubblicata" },
        ].map((k) => (
          <div key={k.l} className="card p-4">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
              <BarChart3 size={14} className="text-gold" /> {k.l}
            </p>
            <p className="num mt-1 font-display text-[24px] font-semibold">{k.v}</p>
            <p className="text-[12px] text-ink-faint">{k.h}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="card" aria-labelledby="t-share">
          <div className="card-head">
            <h2 id="t-share" className="card-title flex items-center gap-2">
              <Share2 size={16} className="text-gold" /> Condividi
            </h2>
          </div>
          <div className="space-y-3 px-4 py-3">
            {giaOnline ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-hover px-2 py-1.5 font-mono text-[12.5px]">{url}</code>
                  <CopyButton text={url} label="Copia link" />
                </div>
                {campaign && (
                  <div>
                    <p className="mb-1 text-[12.5px] font-semibold text-ink-soft">Link per canale (con UTM della campagna)</p>
                    <UtmLinks base={url} utm={campaign.utmCampaign} canali={[...new Set(campaign.plan.canali.map((c) => c.canale))]} />
                  </div>
                )}
              </>
            ) : (
              <p className="text-[13.5px] text-ink-soft">Il link e il QR code compaiono dopo la prima pubblicazione.</p>
            )}
          </div>
        </section>

        <section className="card" aria-labelledby="t-qr">
          <div className="card-head">
            <h2 id="t-qr" className="card-title">
              QR code
            </h2>
          </div>
          <div className="flex flex-col items-center gap-3 px-4 py-4">
            {qr ? (
              <>
                {/* SVG generato dal server a partire dall'indirizzo della pagina */}
                <div className="w-40 rounded-md bg-white p-2" aria-label={`QR code di ${url}`} dangerouslySetInnerHTML={{ __html: qr }} />
                <div className="flex gap-2">
                  <a href={`/api/landing/${l.id}/qr?formato=png`} className="btn-ghost btn-sm">
                    <Download size={14} /> PNG per la stampa
                  </a>
                  <a href={`/api/landing/${l.id}/qr?formato=svg`} className="btn-ghost btn-sm">
                    <Download size={14} /> SVG
                  </a>
                </div>
                <p className="text-center text-[12px] text-ink-faint">Il QR scaricato porta gli UTM «evento/qr»: i lead da volantini e stand si distinguono dagli altri.</p>
              </>
            ) : (
              <p className="text-[13.5px] text-ink-soft">Disponibile dopo la pubblicazione.</p>
            )}
          </div>
        </section>
      </div>

      <section className="card mt-4" aria-labelledby="t-ab">
        <div className="card-head">
          <h2 id="t-ab" className="card-title flex items-center gap-2">
            <FlaskConical size={16} className="text-gold" /> Test A/B
          </h2>
          {ab && <Badge tone="aqua">In corso dal {dataBreve(ab.iniziatoIl)}</Badge>}
        </div>
        <div className="px-4 py-3">
          {ab && risultato ? (
            <>
              <p className="mb-3 text-[13.5px]">
                Elemento: <b>{ELEMENTI_AB.find((e) => e.valore === ab.elemento)?.nome}</b> · Variante B: «{ab.valoreB}»
              </p>
              <div className="-mx-4 overflow-x-auto">
                <table className="num w-full min-w-[420px] text-left text-[13.5px]">
                  <thead className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">
                    <tr className="border-b border-line">
                      <th className="px-4 py-2">Variante</th>
                      <th className="px-2 py-2 text-right">Visite</th>
                      <th className="px-2 py-2 text-right">Lead</th>
                      <th className="px-4 py-2 text-right">Conversione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    <tr className={risultato.vincitore === "A" ? "bg-ok/[.06] font-semibold" : ""}>
                      <td className="px-4 py-2">A (originale)</td>
                      <td className="px-2 py-2 text-right">{l.visits}</td>
                      <td className="px-2 py-2 text-right">{stats.leadA}</td>
                      <td className="px-4 py-2 text-right">{pct(risultato.tassoA)}</td>
                    </tr>
                    <tr className={risultato.vincitore === "B" ? "bg-ok/[.06] font-semibold" : ""}>
                      <td className="px-4 py-2">B</td>
                      <td className="px-2 py-2 text-right">{l.visitsB}</td>
                      <td className="px-2 py-2 text-right">{stats.leadB}</td>
                      <td className="px-4 py-2 text-right">{pct(risultato.tassoB)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className={`mt-3 text-[13.5px] font-medium ${risultato.vincitore ? "text-ok" : "text-ink-soft"}`}>{risultato.messaggio}</p>
              {pubblica && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {risultato.vincitore === "B" && (
                    <form action={applicaB}>
                      <input type="hidden" name="id" value={l.id} />
                      <SubmitButton className="btn-primary" confirm="Applicare la variante B alla pagina e chiudere il test?">
                        Applica la variante B
                      </SubmitButton>
                    </form>
                  )}
                  <form action={fermaAb}>
                    <input type="hidden" name="id" value={l.id} />
                    <SubmitButton className="btn-ghost" confirm={risultato.vincitore === "B" ? "Fermare il test senza applicare B?" : "Fermare il test? Tutti vedranno la versione A."}>
                      Ferma il test
                    </SubmitButton>
                  </form>
                </div>
              )}
            </>
          ) : online && pubblica ? (
            <form action={avviaAb} className="grid grid-cols-[minmax(0,1fr)] items-end gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]">
              <input type="hidden" name="id" value={l.id} />
              <label className="block">
                <span className="label">Cosa provare</span>
                <select name="elemento" className="input" defaultValue="headline">
                  {ELEMENTI_AB.map((e) => (
                    <option key={e.valore} value={e.valore}>
                      {e.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">Variante B</span>
                <input name="valoreB" className="input" required minLength={2} maxLength={300} placeholder="Es. un titolo diverso, o l'indirizzo https di un'altra immagine" />
              </label>
              <SubmitButton className="btn-primary">Avvia il test</SubmitButton>
              <p className="text-[12px] text-ink-faint md:col-span-3">Metà dei nuovi visitatori vede la variante B; i contatori ripartono da zero. Il risultato è affidabile da 100 visite per variante.</p>
            </form>
          ) : (
            <p className="text-[13.5px] text-ink-soft">Il test A/B si avvia su una pagina online.</p>
          )}
        </div>
      </section>
    </>
  );
}
