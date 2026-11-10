import Link from "next/link";
import clsx from "clsx";
import { Plus, ChevronLeft, ChevronRight, CalendarDays, List, Columns3, GanttChart, Users, TriangleAlert, Lock, ArrowLeft, ArrowRight, Filter } from "lucide-react";
import { TASK_STATUS, type TaskStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { calendarItems, listTasks, type TaskItem } from "@/features/calendar/service";
import { TIPI_ATTIVITA, barra, grigliaMese, meseValido, meseVicino, nomeTipoAttivita } from "@/lib/calendar/logic";
import { addDays } from "@/lib/campaigns/generate";
import { dataItalia } from "@/lib/crm/nautilus";
import { dataLunga } from "@/lib/events/catalog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/ui/flash";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { TASK_STATUS_UI, dataBreve } from "@/lib/labels";
import { statoAttivita } from "./actions";

export const metadata = { title: "Calendario" };
export const dynamic = "force-dynamic";

const VISTE = [
  { key: "mese", nome: "Mese", icon: CalendarDays },
  { key: "elenco", nome: "Elenco", icon: List },
  { key: "bacheca", nome: "Bacheca", icon: Columns3 },
  { key: "timeline", nome: "Timeline", icon: GanttChart },
  { key: "persone", nome: "Per persona", icon: Users },
] as const;
type Vista = (typeof VISTE)[number]["key"];

const NOMI_MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const nomeMese = (m: string) => `${NOMI_MESI[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const GIORNI = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];

const TONO_PUNTO: Record<string, string> = {
  neutral: "bg-ink/[.06] text-ink",
  danger: "bg-danger/10 text-danger",
  ok: "bg-ok/10 text-ok line-through decoration-ok/40",
  gold: "bg-gold/15 text-ink font-semibold",
  info: "bg-info/10 text-info",
  aqua: "bg-aqua/10 text-ink",
};

type SP = { vista?: string; mese?: string; campagna?: string; persona?: string; stato?: string; tipo?: string; msg?: string; errore?: string };

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const sp = await searchParams;
  const oggi = dataItalia(new Date());
  const vista: Vista = VISTE.some((v) => v.key === sp.vista) ? (sp.vista as Vista) : "mese";
  const mese = meseValido(sp.mese, oggi);
  const filtri = {
    campagna: /^[0-9a-f-]{36}$/i.test(sp.campagna ?? "") ? sp.campagna : undefined,
    persona: /^[0-9a-f-]{36}$/i.test(sp.persona ?? "") ? sp.persona : undefined,
    stato: sp.stato === "aperte" || TASK_STATUS.includes(sp.stato as TaskStatus) ? sp.stato : undefined,
    tipo: TIPI_ATTIVITA.some((t) => t.key === sp.tipo) ? sp.tipo : undefined,
  };
  const qs = (over: Partial<Record<keyof SP, string | undefined>>) => {
    const base: Record<string, string | undefined> = { vista, mese: vista === "mese" || vista === "timeline" ? mese : undefined, ...filtri, ...over };
    const p = new URLSearchParams(Object.entries(base).filter(([, v]) => v) as [string, string][]);
    return `/calendario?${p}`;
  };
  const qui = qs({});
  const { rows, utenti, campagne } = await listTasks(filtri, oggi);
  const ritardo = rows.filter((t) => t.inRitardo).length;
  const filtriAttivi = Object.values(filtri).filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Calendario di produzione"
        subtitle="Chi fa cosa e per quando: attività, eventi, partenze delle campagne e scadenze delle creatività"
        action={
          <Link href={`/calendario/nuova?ritorno=${encodeURIComponent(qui)}${filtri.campagna ? `&campagna=${filtri.campagna}` : ""}`} className="btn-primary">
            <Plus size={16} /> Nuova attività
          </Link>
        }
      />
      <Flash msg={sp.msg} />
      {sp.errore && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-md bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
          <Lock size={16} /> {sp.errore.slice(0, 200)}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <nav className="flex flex-wrap gap-1" aria-label="Viste del calendario">
          {VISTE.map((v) => (
            <Link key={v.key} href={qs({ vista: v.key })} aria-current={vista === v.key ? "page" : undefined} className={clsx("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold", vista === v.key ? "bg-navy text-white" : "bg-surface text-ink-soft ring-1 ring-line hover:bg-hover")}>
              <v.icon size={14} /> {v.nome}
            </Link>
          ))}
        </nav>
        {ritardo > 0 && (
          <Link href={qs({ vista: "elenco", stato: "aperte" })} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-danger hover:underline">
            <TriangleAlert size={14} /> {ritardo} in ritardo
          </Link>
        )}
      </div>

      <details className="card mb-4" open={filtriAttivi > 0}>
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-ink-soft">
          <Filter size={14} /> Filtri {filtriAttivi > 0 && <Badge tone="gold">{filtriAttivi}</Badge>}
        </summary>
        <form className="grid grid-cols-[minmax(0,1fr)] gap-3 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
          <input type="hidden" name="vista" value={vista} />
          {(vista === "mese" || vista === "timeline") && <input type="hidden" name="mese" value={mese} />}
          <select name="campagna" defaultValue={filtri.campagna ?? ""} className="input" aria-label="Campagna">
            <option value="">Tutte le campagne</option>
            {campagne.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="persona" defaultValue={filtri.persona ?? ""} className="input" aria-label="Responsabile">
            <option value="">Tutte le persone</option>
            {utenti.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select name="stato" defaultValue={filtri.stato ?? ""} className="input" aria-label="Stato">
            <option value="">Tutti gli stati</option>
            <option value="aperte">Da completare</option>
            {TASK_STATUS.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_UI[s].label}
              </option>
            ))}
          </select>
          <select name="tipo" defaultValue={filtri.tipo ?? ""} className="input" aria-label="Tipo">
            <option value="">Tutti i tipi</option>
            {TIPI_ATTIVITA.map((t) => (
              <option key={t.key} value={t.key}>
                {t.nome}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button className="btn-primary btn-sm">Applica</button>
            {filtriAttivi > 0 && (
              <Link href={`/calendario?vista=${vista}`} className="btn-ghost btn-sm">
                Azzera
              </Link>
            )}
          </div>
        </form>
      </details>

      {vista === "mese" && <VistaMese mese={mese} oggi={oggi} filtri={filtri} qs={qs} />}
      {vista === "elenco" && <VistaElenco rows={rows} qui={qui} />}
      {vista === "bacheca" && <VistaBacheca rows={rows} qui={qui} />}
      {vista === "timeline" && <VistaTimeline rows={rows} campagne={campagne} mese={mese} oggi={oggi} qs={qs} filtroCampagna={filtri.campagna} />}
      {vista === "persone" && <VistaPersone rows={rows} utenti={utenti} qui={qui} />}
    </>
  );
}

// ---------------------------------------------------------------------------

function NavMese({ mese, qs }: { mese: string; qs: (o: Partial<Record<keyof SP, string>>) => string }) {
  return (
    <div className="flex items-center gap-1">
      <Link href={qs({ mese: meseVicino(mese, -1) })} className="btn-ghost btn-sm" aria-label="Mese precedente">
        <ChevronLeft size={16} />
      </Link>
      <span className="min-w-[130px] text-center font-display text-[16px] font-semibold capitalize">{nomeMese(mese)}</span>
      <Link href={qs({ mese: meseVicino(mese, 1) })} className="btn-ghost btn-sm" aria-label="Mese successivo">
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}

async function VistaMese({ mese, oggi, filtri, qs }: { mese: string; oggi: string; filtri: { campagna?: string; persona?: string; stato?: string; tipo?: string }; qs: (o: Partial<Record<keyof SP, string>>) => string }) {
  const g = grigliaMese(mese);
  const da = g[0][0].data;
  const a = g.at(-1)!.at(-1)!.data;
  const voci = await calendarItems(da, a, filtri);
  const perGiorno = new Map<string, typeof voci>();
  for (const v of voci) perGiorno.set(v.data, [...(perGiorno.get(v.data) ?? []), v]);
  const ordine = { evento: 0, campagna: 1, attivita: 2, asset: 3 };
  for (const l of perGiorno.values()) l.sort((x, y) => ordine[x.tipo] - ordine[y.tipo]);
  const giorniMese = [...perGiorno.keys()].filter((d) => d.slice(0, 7) === mese).sort();

  return (
    <section className="card overflow-hidden">
      <div className="card-head flex-wrap gap-2">
        <NavMese mese={mese} qs={qs} />
        <div className="flex flex-wrap gap-2 text-[11.5px]">
          <Badge tone="gold">Evento</Badge>
          <Badge tone="info">Campagna</Badge>
          <Badge tone="neutral">Attività</Badge>
          <Badge tone="aqua">Creatività</Badge>
          <Badge tone="danger">In ritardo</Badge>
        </div>
      </div>
      {/* Griglia da tablet in su */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b border-line bg-ink/[.02] text-center text-[11.5px] font-semibold uppercase text-ink-faint">
          {GIORNI.map((d) => (
            <div key={d} className="py-1.5">
              {d}
            </div>
          ))}
        </div>
        {g.map((sett, i) => (
          <div key={i} className="grid grid-cols-7 border-b border-line last:border-b-0">
            {sett.map(({ data, nelMese }) => {
              const lista = perGiorno.get(data) ?? [];
              return (
                <div key={data} className={clsx("group min-h-[104px] min-w-0 border-r border-line p-1.5 last:border-r-0", !nelMese && "bg-ink/[.025]")}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={clsx("num grid h-6 w-6 place-items-center rounded-full text-[12px]", data === oggi ? "bg-navy font-semibold text-white" : nelMese ? "text-ink" : "text-ink-faint")}>{Number(data.slice(8))}</span>
                    <Link href={`/calendario/nuova?data=${data}&ritorno=${encodeURIComponent(qs({}))}`} className="text-ink-faint opacity-0 hover:text-navy focus:opacity-100 group-hover:opacity-100" aria-label={`Nuova attività il ${data}`}>
                      <Plus size={14} />
                    </Link>
                  </div>
                  <ul className="space-y-0.5">
                    {lista.slice(0, 4).map((v, j) => (
                      <li key={j}>
                        <Link href={v.href} title={v.titolo} className={clsx("block truncate rounded px-1.5 py-0.5 text-[11.5px] hover:ring-1 hover:ring-line", TONO_PUNTO[v.tono])}>
                          {v.titolo}
                        </Link>
                      </li>
                    ))}
                    {lista.length > 4 && <li className="px-1.5 text-[11px] font-semibold text-ink-faint">+{lista.length - 4} altre</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* Agenda su telefono */}
      <div className="md:hidden">
        {giorniMese.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">Niente in programma questo mese.</p>
        ) : (
          <ol className="divide-y divide-line">
            {giorniMese.map((d) => (
              <li key={d} className="px-4 py-3">
                <p className={clsx("mb-1.5 text-[12.5px] font-semibold capitalize", d === oggi ? "text-navy" : "text-ink-soft")}>
                  {dataLunga(d)}
                  {d === oggi ? " · oggi" : ""}
                </p>
                <ul className="space-y-1">
                  {perGiorno.get(d)!.map((v, j) => (
                    <li key={j}>
                      <Link href={v.href} className={clsx("block truncate rounded px-2 py-1 text-[13px]", TONO_PUNTO[v.tono])}>
                        {v.titolo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

/** Pulsanti per far avanzare (o riaprire) un'attività senza aprirla. */
const PROSSIMI: Record<TaskStatus, { to: TaskStatus; label: string }[]> = {
  DA_FARE: [{ to: "IN_CORSO", label: "Avvia" }],
  IN_CORSO: [
    { to: "IN_REVISIONE", label: "In revisione" },
    { to: "FATTO", label: "Fatto" },
  ],
  IN_REVISIONE: [
    { to: "FATTO", label: "Fatto" },
    { to: "IN_CORSO", label: "Riapri" },
  ],
  FATTO: [{ to: "IN_CORSO", label: "Riapri" }],
};

function CambiaStato({ t, to, qui, children, className, title }: { t: TaskItem; to: TaskStatus; qui: string; children: React.ReactNode; className?: string; title?: string }) {
  return (
    <form action={statoAttivita}>
      <input type="hidden" name="id" value={t.id} />
      <input type="hidden" name="to" value={to} />
      <input type="hidden" name="ritorno" value={qui} />
      <SubmitButton className={className ?? "btn-ghost btn-sm"} title={title}>
        {children}
      </SubmitButton>
    </form>
  );
}

function Meta({ t }: { t: TaskItem }) {
  return (
    <p className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-ink-faint">
      <span className={clsx("num", t.inRitardo && "font-semibold text-danger")}>
        {t.inRitardo ? "Scaduta " : ""}
        {dataBreve(t.dueDate)}
      </span>
      <span>· {nomeTipoAttivita(t.kind)}</span>
      {t.assigneeName ? <span>· {t.assigneeName}</span> : <span className="text-warn">· da assegnare</span>}
      {t.campaignName && <span className="truncate">· {t.campaignName}</span>}
      {t.eventName && <span className="truncate">· {t.eventName}</span>}
    </p>
  );
}

function Vuoto() {
  return (
    <div className="card">
      <EmptyState icon={CalendarDays} title="Nessuna attività" text="Cambia i filtri o aggiungi un'attività." />
    </div>
  );
}

function VistaElenco({ rows, qui }: { rows: TaskItem[]; qui: string }) {
  if (!rows.length) return <Vuoto />;
  return (
    <section className="card overflow-hidden">
      <ul className="divide-y divide-line">
        {rows.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
            <div className="min-w-0 flex-1 basis-[240px]">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/calendario/${t.id}?ritorno=${encodeURIComponent(qui)}`} className={clsx("text-[13.5px] font-semibold hover:underline", t.status === "FATTO" && "text-ink-faint line-through")}>
                  {t.title}
                </Link>
                <Badge tone={TASK_STATUS_UI[t.status].tone}>{TASK_STATUS_UI[t.status].label}</Badge>
                {t.bloccata && (
                  <span className="inline-flex items-center gap-1 text-[12px] text-warn" title={`Aspetta: ${t.dipendenza?.title}`}>
                    <Lock size={12} /> aspetta «{t.dipendenza?.title}»
                  </span>
                )}
              </div>
              <Meta t={t} />
            </div>
            <div className="flex gap-1">
              {PROSSIMI[t.status].map((p) => (
                <CambiaStato key={p.to} t={t} to={p.to} qui={qui} className={p.to === "FATTO" ? "btn-primary btn-sm" : "btn-ghost btn-sm"}>
                  {p.label}
                </CambiaStato>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function VistaBacheca({ rows, qui }: { rows: TaskItem[]; qui: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-4">
      {TASK_STATUS.map((s, i) => {
        const col = rows.filter((t) => t.status === s);
        return (
          <section key={s} className="card min-w-0 overflow-hidden" aria-label={TASK_STATUS_UI[s].label}>
            <div className="card-head">
              <h2 className="card-title">{TASK_STATUS_UI[s].label}</h2>
              <span className="num text-[12.5px] text-ink-faint">{col.length}</span>
            </div>
            <ul className="space-y-2 p-2">
              {col.map((t) => (
                <li key={t.id} className={clsx("rounded-md bg-surface p-2.5 ring-1", t.inRitardo ? "ring-danger/40" : "ring-line")}>
                  <Link href={`/calendario/${t.id}?ritorno=${encodeURIComponent(qui)}`} className="text-[13px] font-semibold hover:underline">
                    {t.title}
                  </Link>
                  {t.bloccata && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-warn">
                      <Lock size={11} /> aspetta «{t.dipendenza?.title}»
                    </p>
                  )}
                  <Meta t={t} />
                  <div className="mt-2 flex justify-between">
                    {i > 0 ? (
                      <CambiaStato t={t} to={TASK_STATUS[i - 1]} qui={qui} title={`Sposta in ${TASK_STATUS_UI[TASK_STATUS[i - 1]].label}`}>
                        <ArrowLeft size={14} />
                        <span className="sr-only">Indietro</span>
                      </CambiaStato>
                    ) : (
                      <span />
                    )}
                    {i < TASK_STATUS.length - 1 && (
                      <CambiaStato t={t} to={TASK_STATUS[i + 1]} qui={qui} title={`Sposta in ${TASK_STATUS_UI[TASK_STATUS[i + 1]].label}`}>
                        <span className="text-[12px]">{TASK_STATUS_UI[TASK_STATUS[i + 1]].label}</span> <ArrowRight size={14} />
                      </CambiaStato>
                    )}
                  </div>
                </li>
              ))}
              {col.length === 0 && <li className="px-2 py-3 text-[12.5px] text-ink-faint">Vuoto</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function VistaTimeline({ rows, campagne, mese, oggi, qs, filtroCampagna }: { rows: TaskItem[]; campagne: { id: string; name: string; startDate: string | null; endDate: string | null; status: string }[]; mese: string; oggi: string; qs: (o: Partial<Record<keyof SP, string>>) => string; filtroCampagna?: string }) {
  // Finestra di 3 mesi a partire dal mese scelto.
  const da = `${mese}-01`;
  const a = addDays(`${meseVicino(mese, 3)}-01`, -1);
  const mesi = [mese, meseVicino(mese, 1), meseVicino(mese, 2)].map((m) => ({ m, b: barra(`${m}-01`, addDays(`${meseVicino(m, 1)}-01`, -1), da, a)! }));
  const righe = campagne
    .filter((c) => (!filtroCampagna || c.id === filtroCampagna) && c.startDate && c.endDate && c.status !== "BOZZA")
    .map((c) => ({ id: c.id, nome: c.name, b: barra(c.startDate!, c.endDate!, da, a), periodo: `${dataBreve(c.startDate!)} → ${dataBreve(c.endDate!)}`, tasks: rows.filter((t) => t.campaignId === c.id) }))
    .filter((r) => r.b || r.tasks.some((t) => t.dueDate >= da && t.dueDate <= a));
  const senza = rows.filter((t) => !t.campaignId && t.dueDate >= da && t.dueDate <= a);
  const oggiB = barra(oggi, oggi, da, a);
  const punti = (ts: TaskItem[]) =>
    ts.map((t) => {
      const b = barra(t.dueDate, t.dueDate, da, a);
      if (!b) return null;
      return (
        <Link
          key={t.id}
          href={`/calendario/${t.id}?ritorno=${encodeURIComponent(qs({}))}`}
          title={`${t.title} · ${dataBreve(t.dueDate)} · ${TASK_STATUS_UI[t.status].label}`}
          className={clsx("absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface", t.status === "FATTO" ? "bg-ok" : t.inRitardo ? "bg-danger" : t.status === "DA_FARE" ? "bg-ink-faint" : "bg-info")}
          style={{ left: `${b.left + b.width / 2}%` }}
        >
          <span className="sr-only">{t.title}</span>
        </Link>
      );
    });

  return (
    <section className="card overflow-hidden">
      <div className="card-head flex-wrap gap-2">
        <NavMese mese={mese} qs={qs} />
        <span className="text-[12px] text-ink-faint">3 mesi · barre = durata campagna · punti = attività (verde fatta, rossa in ritardo)</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[640px] p-4">
          <div className="relative ml-[180px] h-6 border-b border-line">
            {mesi.map(({ m, b }) => (
              <span key={m} className="absolute top-0 border-l border-line pl-1 text-[11.5px] font-semibold capitalize text-ink-faint" style={{ left: `${b.left}%`, width: `${b.width}%` }}>
                {nomeMese(m)}
              </span>
            ))}
          </div>
          {righe.length === 0 && senza.length === 0 && <p className="py-6 text-sm text-ink-soft">Nessuna campagna o attività nei tre mesi.</p>}
          {righe.map((r) => (
            <div key={r.id} className="flex items-center border-b border-line/70 py-2">
              <Link href={`/campagne/${r.id}`} className="w-[180px] shrink-0 truncate pr-3 text-[12.5px] font-semibold hover:underline" title={`${r.nome} · ${r.periodo}`}>
                {r.nome}
              </Link>
              <div className="relative h-7 flex-1">
                {oggiB && <span className="absolute inset-y-0 w-px bg-danger/50" style={{ left: `${oggiB.left + oggiB.width / 2}%` }} aria-hidden />}
                {r.b && <span className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-navy/20" style={{ left: `${r.b.left}%`, width: `${r.b.width}%` }} title={r.periodo} />}
                {punti(r.tasks)}
              </div>
            </div>
          ))}
          {senza.length > 0 && (
            <div className="flex items-center py-2">
              <span className="w-[180px] shrink-0 pr-3 text-[12.5px] text-ink-soft">Senza campagna</span>
              <div className="relative h-7 flex-1">{punti(senza)}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function VistaPersone({ rows, utenti, qui }: { rows: TaskItem[]; utenti: { id: string; name: string }[]; qui: string }) {
  const gruppi = [...utenti.map((u) => ({ id: u.id, nome: u.name })), { id: null as string | null, nome: "Da assegnare" }]
    .map((g) => {
      const mie = rows.filter((t) => (t.assigneeId ?? null) === g.id);
      const aperte = mie.filter((t) => t.status !== "FATTO");
      return { ...g, aperte, ritardo: aperte.filter((t) => t.inRitardo).length, fatte: mie.length - aperte.length };
    })
    .filter((g) => g.aperte.length || g.fatte);
  if (!gruppi.length) return <Vuoto />;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-2">
      {gruppi.map((g) => (
        <section key={g.id ?? "nessuno"} className="card min-w-0 overflow-hidden">
          <div className="card-head">
            <h2 className="card-title">{g.nome}</h2>
            <span className="num text-[12.5px] text-ink-faint">
              {g.aperte.length} da completare{g.ritardo ? ` · ` : ""}
              {g.ritardo ? <span className="font-semibold text-danger">{g.ritardo} in ritardo</span> : null} · {g.fatte} fatte
            </span>
          </div>
          <ul className="divide-y divide-line">
            {g.aperte.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center gap-2 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <Link href={`/calendario/${t.id}?ritorno=${encodeURIComponent(qui)}`} className="block truncate text-[13px] font-semibold hover:underline">
                    {t.title}
                  </Link>
                  <p className={clsx("num text-[12px]", t.inRitardo ? "font-semibold text-danger" : "text-ink-faint")}>
                    {dataBreve(t.dueDate)} · {TASK_STATUS_UI[t.status].label}
                  </p>
                </div>
              </li>
            ))}
            {g.aperte.length > 8 && <li className="px-4 py-2 text-[12px] text-ink-faint">e altre {g.aperte.length - 8}</li>}
            {g.aperte.length === 0 && <li className="px-4 py-3 text-[12.5px] text-ok">Tutto fatto.</li>}
          </ul>
        </section>
      ))}
    </div>
  );
}
