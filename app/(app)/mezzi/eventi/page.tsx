import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Plus, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { elencoEventi, iscrittiPerEvento } from "@/features/vetrina/contenuti";
import { eventoFuturo, periodo, TIPI_EVENTO } from "@/lib/vetrina/contenuti";
import { oggiRoma } from "@/lib/vetrina/promo";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/ui/flash";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Eventi e prove in mare" };
export const dynamic = "force-dynamic";

export default async function EventiAdmin({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireUser("contenuti:scrivi");
  const [lista, iscritti, sp] = await Promise.all([elencoEventi(), iscrittiPerEvento(), searchParams]);
  const oggi = oggiRoma();
  const online = lista.some((e) => e.stato === "PUBBLICATO" && eventoFuturo(e, oggi));
  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <PageHeader
        title="Eventi e prove in mare"
        subtitle="Giornate di prova, open day, saloni. I clienti si iscrivono dal sito e l'iscrizione arriva tra i lead. Gli eventi passati spariscono dal sito da soli."
        action={
          <div className="flex flex-wrap gap-2">
            {online && (
              <Link href="/vetrina/eventi" target="_blank" className="btn-ghost">
                <ExternalLink size={16} /> Vedi sul sito
              </Link>
            )}
            <Link href="/mezzi/eventi/nuovo" className="btn-primary">
              <Plus size={16} /> Nuovo evento
            </Link>
          </div>
        }
      />
      <Flash msg={sp.msg} />
      <div className="mx-auto max-w-3xl space-y-3">
        {lista.length === 0 && <EmptyState icon={CalendarDays} title="Nessun evento" text="Crea una giornata di prove in mare: data, luogo, mezzi in prova e posti. Il modulo di iscrizione è già pronto." action={<Link href="/mezzi/eventi/nuovo" className="btn-primary">Crea il primo evento</Link>} />}
        {lista.map((e) => {
          const futuro = eventoFuturo(e, oggi);
          const n = iscritti[e.id] ?? 0;
          return (
            <Link key={e.id} href={`/mezzi/eventi/${e.id}`} className={`card flex flex-wrap items-start justify-between gap-3 p-4 text-[13px] hover:border-navy/40 ${futuro ? "" : "opacity-60"}`}>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {e.titolo}
                  <Badge tone="info">{TIPI_EVENTO.find((t) => t.id === e.tipo)?.nome}</Badge>
                  {!futuro ? <Badge tone="neutral">Concluso</Badge> : <Badge tone={e.stato === "PUBBLICATO" ? "ok" : "neutral"}>{e.stato === "PUBBLICATO" ? "Online" : "Bozza"}</Badge>}
                </p>
                <p className="text-ink-soft">
                  {periodo(e.data, e.dataFine)}
                  {e.orario ? ` · ${e.orario}` : ""}
                  {e.luogo ? ` · ${e.luogo}` : ""}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 font-semibold text-navy">
                <Users size={15} /> {n}
                {e.posti ? ` / ${e.posti}` : ""} iscritti
              </span>
            </Link>
          );
        })}
        <p className="text-[12px] text-ink-faint">Gli iscritti li trovi in Lead, con la risposta &quot;Richiesta: Iscrizione evento&quot;.</p>
      </div>
    </>
  );
}
