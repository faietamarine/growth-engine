import Link from "next/link";
import { ArrowLeft, ExternalLink, Newspaper, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { elencoPost } from "@/features/vetrina/contenuti";
import { dataLunga, estratto } from "@/lib/vetrina/contenuti";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/ui/flash";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { caricaArticoliInizialiAction } from "../contenuti/actions";

export const metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

export default async function BlogAdmin({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireUser("contenuti:scrivi");
  const [lista, sp] = await Promise.all([elencoPost(), searchParams]);
  const online = lista.filter((p) => p.stato === "PUBBLICATO").length;
  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <PageHeader
        title="Blog"
        subtitle="Articoli del sito: consigli, novità, guide. La sezione compare sul sito solo quando c'è almeno un articolo pubblicato."
        action={
          <div className="flex flex-wrap gap-2">
            {online > 0 && (
              <Link href="/vetrina/blog" target="_blank" className="btn-ghost">
                <ExternalLink size={16} /> Vedi sul sito
              </Link>
            )}
            <Link href="/mezzi/blog/nuovo" className="btn-primary">
              <Plus size={16} /> Nuovo articolo
            </Link>
          </div>
        }
      />
      <Flash msg={sp.msg} />
      <div className="mx-auto max-w-3xl space-y-3">
        <p className="text-[12px] text-ink-faint">Consiglio: un articolo ogni 2–3 settimane. Un blog fermo da mesi dà l'idea di un'azienda ferma.</p>
        {lista.length < 3 && (
          <form action={caricaArticoliInizialiAction} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-[13px]">
            <span>Ti ho preparato 3 articoli di partenza (primo gommone, rimessaggio invernale, controlli prima del varo). Arrivano come bozze: li rileggi, aggiungi una foto e li pubblichi.</span>
            <SubmitButton className="btn-ghost">Carica i 3 articoli in bozza</SubmitButton>
          </form>
        )}
        {lista.length === 0 && <EmptyState icon={Newspaper} title="Nessun articolo" text="Scrivi il primo: una guida utile ai tuoi clienti porta visite da Google per anni." action={<Link href="/mezzi/blog/nuovo" className="btn-primary">Scrivi il primo articolo</Link>} />}
        {lista.map((p) => (
          <Link key={p.id} href={`/mezzi/blog/${p.id}`} className="card flex gap-3 p-4 text-[13px] hover:border-navy/40">
            {p.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/media/${p.foto}`} alt="" className="h-16 w-24 shrink-0 rounded object-cover" />
            ) : (
              <div className="grid h-16 w-24 shrink-0 place-items-center rounded bg-navy/5 text-ink-faint">
                <Newspaper size={20} />
              </div>
            )}
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {p.titolo} <Badge tone={p.stato === "PUBBLICATO" ? "ok" : "neutral"}>{p.stato === "PUBBLICATO" ? "Online" : "Bozza"}</Badge>
              </p>
              <p className="text-ink-soft">{p.pubblicatoIl ? dataLunga(p.pubblicatoIl) : "Mai pubblicato"}</p>
              <p className="mt-1 line-clamp-2 text-ink-soft">{p.sommario || estratto(p.testo, 140)}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
