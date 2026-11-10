import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import {
  ArrowLeft, Pencil, Trash2, Megaphone, MapPin, Clock, Users, UserCheck, ClipboardList, Euro, Target, PanelsTopLeft,
  QrCode, FileDown, CalendarPlus, TabletSmartphone, CheckCircle2, Circle, TriangleAlert, Mail, MessageCircle, ExternalLink,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { getEvent } from "@/features/events/service";
import { EventIcon } from "@/features/events/event-icon";
import { allowedTransitions } from "@/lib/campaigns/status";
import { dataLunga } from "@/lib/events/catalog";
import { fasciaDi } from "@/lib/events/logic";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/ui/flash";
import { Stat } from "@/components/ui/stat";
import { Progress } from "@/components/ui/progress";
import { SubmitButton } from "@/components/ui/submit-button";
import { CopyButton } from "@/components/ui/copy-button";
import { EVENT_STATUS_UI, LEAD_STATUS_UI, WORK_STATUS_UI, euro } from "@/lib/labels";
import { cambiaStatoEvento, checkIn, creaPaginaIscrizione, eliminaEvento, mettiInCalendario, spuntaVoce } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = /^[0-9a-f-]{36}$/i.test(id) ? await getEvent(id) : null;
  return { title: d?.evento.name ?? "Evento" };
}

const num = (n: number | null, suff = "") => (n === null ? "—" : `${n.toLocaleString("it-IT")}${suff}`);

export default async function EventoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; errore?: string; q?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await getEvent(id);
  if (!d) notFound();
  const sp = await searchParams;
  const { evento: e, tipo, numeri: n, metriche: m } = d;
  const scrivi = can(user.role, "eventi:scrivi");
  const vediLead = can(user.role, "lead:vedi");
  const fatte = tipo.checklist.filter((v) => e.checklist[v]).length;
  const q = (sp.q ?? "").trim().toLowerCase().slice(0, 40);
  const iscritti = d.iscritti.filter((l) => !q || `${l.firstName} ${l.lastName} ${l.phone} ${l.company}`.toLowerCase().includes(q));

  return (
    <>
      <Link href="/eventi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Eventi
      </Link>
      <Flash msg={sp.msg} />
      {sp.errore && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-md bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
          <TriangleAlert size={16} /> {sp.errore.slice(0, 200)}
        </p>
      )}

      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={EVENT_STATUS_UI[e.status].tone}>{EVENT_STATUS_UI[e.status].label}</Badge>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
            <span className="text-gold">
              <EventIcon icona={tipo.icona} size={15} />
            </span>
            {tipo.nome}
          </span>
        </div>
        <h1 className="mt-2 font-display text-[22px] font-semibold leading-tight lg:text-[26px]">{e.name}</h1>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} /> {dataLunga(e.date)} · {e.time}–{e.endTime}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} /> {e.venue}
          </span>
          {d.campaign && (
            <Link href={`/campagne/${d.campaign.id}`} className="inline-flex items-center gap-1.5 font-semibold text-navy hover:underline">
              <Megaphone size={14} /> {d.campaign.name}
            </Link>
          )}
        </p>
        {e.objective && <p className="mt-2 max-w-3xl text-[13.5px]">{e.objective}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {allowedTransitions(e.status, user.role, "evento").map((t) => (
            <form key={t.to} action={cambiaStatoEvento}>
              <input type="hidden" name="id" value={e.id} />
              <input type="hidden" name="to" value={t.to} />
              <SubmitButton className={t.primaria ? "btn-primary" : "btn-ghost"} confirm={t.conferma}>
                {t.label}
              </SubmitButton>
            </form>
          ))}
          {scrivi && (
            <Link href={`/eventi/${e.id}/raccolta`} className="btn-gold">
              <TabletSmartphone size={15} /> Raccogli contatti sul posto
            </Link>
          )}
          {scrivi && (
            <Link href={`/eventi/${e.id}/modifica`} className="btn-ghost">
              <Pencil size={15} /> {e.status === "CONCLUSO" ? "Spesa e note" : "Modifica"}
            </Link>
          )}
          {scrivi && e.status === "BOZZA" && d.iscritti.length === 0 && (
            <form action={eliminaEvento}>
              <input type="hidden" name="id" value={e.id} />
              <SubmitButton className="btn-ghost text-danger" confirm="Eliminare definitivamente questo evento?">
                <Trash2 size={15} /> Elimina
              </SubmitButton>
            </form>
          )}
        </div>
      </header>

      {/* Numeri */}
      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Numeri dell'evento">
        <Stat icon={Users} label="Iscritti" value={n.iscritti} hint={e.capacity > 0 ? `su ${e.capacity} posti · ${num(m.postiLiberi)} liberi` : "posti senza limite"} />
        <Stat icon={UserCheck} label="Presenti" value={n.presenti} hint={`${num(m.tassoPresenza, "%")} degli iscritti`} />
        <Stat icon={TabletSmartphone} label="Raccolti sul posto" value={n.sulPosto} hint="senza iscrizione" />
        <Stat icon={Target} label="Lead qualificati" value={n.qualificati} hint={`${n.consegnati} già nel CRM`} />
        <Stat icon={Euro} label="Costo per lead" value={m.costoPerLead === null ? "—" : euro(m.costoPerLead)} hint={`spesa ${euro(e.spent)} su ${euro(e.budget)}`} />
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-5">
          {/* Pagina di iscrizione */}
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Pagina di iscrizione</h2>
              {d.landing && <Badge tone={WORK_STATUS_UI[d.landing.status].tone}>{WORK_STATUS_UI[d.landing.status].label}</Badge>}
            </div>
            <div className="space-y-3 p-4 text-[13.5px]">
              {!d.landing ? (
                <>
                  <p className="text-ink-soft">Crea la landing con data, luogo e form di iscrizione già compilati{tipo.fasceOrarie ? " (con scelta della fascia oraria)" : ""}. Chi si iscrive diventa un iscritto di questo evento e un lead della campagna.</p>
                  {scrivi && (
                    <form action={creaPaginaIscrizione}>
                      <input type="hidden" name="id" value={e.id} />
                      <SubmitButton className="btn-primary">
                        <PanelsTopLeft size={15} /> Crea la pagina di iscrizione
                      </SubmitButton>
                    </form>
                  )}
                </>
              ) : (
                <>
                  {d.linkIscrizione ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="min-w-0 max-w-full truncate rounded bg-ink/[.05] px-2 py-1 text-[12.5px]">{d.linkIscrizione}</code>
                      <CopyButton text={d.linkIscrizione} label="Copia link" />
                    </div>
                  ) : (
                    <p className="text-ink-soft">{d.landing.status === "CONCLUSO" ? "Iscrizioni chiuse." : "La pagina non è ancora online: rifiniscila e pubblicala dalla sezione Landing."}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/landing/${d.landing.id}`} className="btn-ghost btn-sm">
                      <ExternalLink size={14} /> Apri la landing
                    </Link>
                    {d.linkIscrizione && (
                      <a href={`/api/landing/${d.landing.id}/qr`} className="btn-ghost btn-sm">
                        <QrCode size={14} /> QR per totem e volantini
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Iscritti e check-in */}
          {vediLead ? (
            <section className="card overflow-hidden">
              <div className="card-head flex-wrap gap-2">
                <h2 className="card-title">Iscritti e check-in</h2>
                <div className="flex items-center gap-2">
                  <span className="num text-[12.5px] text-ink-faint">
                    {n.presenti + n.sulPosto} presenti · {d.iscritti.length} contatti
                  </span>
                  {d.iscritti.length > 0 && (
                    <a href={`/api/eventi/${e.id}/iscritti`} className="btn-ghost btn-sm">
                      <FileDown size={14} /> CSV
                    </a>
                  )}
                </div>
              </div>
              {d.iscritti.length > 6 && (
                <form className="border-b border-line px-4 py-2" role="search">
                  <input name="q" defaultValue={sp.q} placeholder="Cerca per nome, telefono o azienda" className="input" aria-label="Cerca iscritto" />
                </form>
              )}
              {d.iscritti.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-soft">Ancora nessun iscritto. Condividi il link della pagina di iscrizione o raccogli i contatti sul posto.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {iscritti.map((l) => {
                    const presente = l.onSite || !!l.checkedInAt;
                    const fascia = fasciaDi(l.answers);
                    return (
                      <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[13.5px] font-semibold">
                              {l.firstName} {l.lastName}
                            </span>
                            {l.onSite && <Badge tone="gold">Sul posto</Badge>}
                            <Badge tone={LEAD_STATUS_UI[l.status].tone}>{LEAD_STATUS_UI[l.status].label}</Badge>
                          </div>
                          <p className="truncate text-[12.5px] text-ink-faint">
                            <a href={`tel:${l.phone}`} className="hover:underline">
                              {l.phone}
                            </a>
                            {fascia ? ` · ${fascia}` : ""}
                            {l.interest ? ` · ${l.interest}` : ""}
                          </p>
                        </div>
                        {scrivi && !l.onSite ? (
                          <form action={checkIn}>
                            <input type="hidden" name="id" value={e.id} />
                            <input type="hidden" name="leadId" value={l.id} />
                            <input type="hidden" name="presente" value={presente ? "0" : "1"} />
                            <SubmitButton className={clsx("btn-sm min-w-[104px]", presente ? "btn-ghost text-ok" : "btn-ghost")} title={presente ? "Annulla il check-in" : "Segna presente"}>
                              {presente ? <CheckCircle2 size={15} /> : <Circle size={15} />} {presente ? "Presente" : "Check-in"}
                            </SubmitButton>
                          </form>
                        ) : (
                          presente && (
                            <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ok">
                              <CheckCircle2 size={15} /> Presente
                            </span>
                          )
                        )}
                      </li>
                    );
                  })}
                  {iscritti.length === 0 && <li className="px-4 py-4 text-sm text-ink-soft">Nessun iscritto corrisponde alla ricerca.</li>}
                </ul>
              )}
            </section>
          ) : null}

          {/* Comunicazioni */}
          <section className="card overflow-hidden">
            <div className="card-head flex-wrap gap-2">
              <h2 className="card-title">Inviti, promemoria e follow-up</h2>
              {scrivi &&
                (d.attivitaCreate > 0 ? (
                  <Link href={`/calendario?vista=elenco`} className="text-[12.5px] font-semibold text-navy hover:underline">
                    {d.attivitaCreate} attività in calendario
                  </Link>
                ) : (
                  <form action={mettiInCalendario}>
                    <input type="hidden" name="id" value={e.id} />
                    <SubmitButton className="btn-ghost btn-sm">
                      <CalendarPlus size={14} /> Metti in calendario
                    </SubmitButton>
                  </form>
                ))}
            </div>
            <p className="border-b border-line bg-info/[.06] px-4 py-2 text-[12.5px] text-ink-soft">
              L&apos;invio automatico richiede un servizio email/WhatsApp collegato (non ancora attivo): qui trovi i testi già compilati e le date. Copiali e inviali dal tuo strumento, oppure mettili in calendario come attività.
            </p>
            <ol className="divide-y divide-line">
              {d.comunicazioni.map((c, i) => (
                <li key={i} className={clsx("px-4 py-3", c.passata && "opacity-60")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num text-[12.5px] font-semibold">{dataLunga(c.quando)}</span>
                    <Badge tone={c.canale === "EMAIL" ? "info" : "ok"}>
                      {c.canale === "EMAIL" ? <Mail size={12} /> : <MessageCircle size={12} />} {c.canale === "EMAIL" ? "Email" : "WhatsApp"}
                    </Badge>
                    <span className="text-[13px] font-semibold">{c.titolo}</span>
                    <span className="text-[12px] text-ink-faint">{c.giorni < 0 ? `${-c.giorni} ${c.giorni === -1 ? "giorno" : "giorni"} prima` : `${c.giorni} ${c.giorni === 1 ? "giorno" : "giorni"} dopo`}</span>
                    <span className="ml-auto">
                      <CopyButton text={c.testoCompilato} />
                    </span>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-[13px] text-ink-soft">{c.testoCompilato}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          {/* Checklist */}
          <section className="card">
            <div className="card-head">
              <h2 className="card-title inline-flex items-center gap-2">
                <ClipboardList size={16} className="text-gold" /> Checklist logistica
              </h2>
              <span className="num text-[12.5px] text-ink-faint">
                {fatte}/{tipo.checklist.length}
              </span>
            </div>
            <div className="px-4 pt-3">
              <Progress value={fatte} max={tipo.checklist.length} label="Avanzamento checklist" />
            </div>
            <ul className="p-2">
              {tipo.checklist.map((v) => {
                const ok = !!e.checklist[v];
                return (
                  <li key={v}>
                    {scrivi ? (
                      <form action={spuntaVoce}>
                        <input type="hidden" name="id" value={e.id} />
                        <input type="hidden" name="voce" value={v} />
                        <input type="hidden" name="fatto" value={ok ? "0" : "1"} />
                        <button type="submit" className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-hover" aria-pressed={ok}>
                          {ok ? <CheckCircle2 size={16} className="mt-px shrink-0 text-ok" /> : <Circle size={16} className="mt-px shrink-0 text-ink-faint" />}
                          <span className={clsx(ok && "text-ink-faint line-through")}>{v}</span>
                        </button>
                      </form>
                    ) : (
                      <span className="flex items-start gap-2 px-2 py-1.5 text-[13px]">
                        {ok ? <CheckCircle2 size={16} className="shrink-0 text-ok" /> : <Circle size={16} className="shrink-0 text-ink-faint" />} {v}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Copione */}
          <section className="card">
            <div className="card-head">
              <h2 className="card-title">Copione per lo staff</h2>
              <CopyButton text={tipo.copione.map((c, i) => `${i + 1}. ${c}`).join("\n")} />
            </div>
            <ol className="list-decimal space-y-1.5 py-3 pl-9 pr-4 text-[13px]">
              {tipo.copione.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </section>

          {e.notes && (
            <section className="card">
              <div className="card-head">
                <h2 className="card-title">Note</h2>
              </div>
              <p className="whitespace-pre-line p-4 text-[13px]">{e.notes}</p>
            </section>
          )}
          {d.owner && <p className="text-[12.5px] text-ink-faint">Responsabile: {d.owner.name}</p>}
        </div>
      </div>
    </>
  );
}
