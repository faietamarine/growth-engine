import Link from "next/link";
import { Plus, Ship, Globe, TriangleAlert, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { elencoMezzi } from "@/features/vetrina/service";
import { getMarchio } from "@/lib/brands/catalog";
import { CONDIZIONI, euro, nomeCategoria, STATO_UI, type StatoMezzo } from "@/lib/vetrina/catalog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Flash } from "@/components/ui/flash";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { statoMezzoAction } from "./actions";

export const metadata = { title: "Vetrina mezzi" };
export const dynamic = "force-dynamic";

const TONO: Record<StatoMezzo, "neutral" | "ok" | "gold"> = { BOZZA: "neutral", PUBBLICATO: "ok", VENDUTO: "gold" };

export default async function MezziPage({ searchParams }: { searchParams: Promise<{ msg?: string; errore?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const scrivi = can(user.role, "contenuti:scrivi");
  const mezzi = await elencoMezzi();
  return (
    <>
      <PageHeader
        title="Vetrina mezzi"
        subtitle="Gli annunci del sito pubblico: li inserisci qui e compaiono online"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/vetrina" target="_blank" className="btn-ghost">
              <ExternalLink size={16} /> Apri il sito
            </Link>
            {scrivi && (
              <>
                <Link href="/mezzi/sito" className="btn-ghost">
                  <Globe size={16} /> Banner e contatti
                </Link>
                <Link href="/mezzi/nuovo" className="btn-primary">
                  <Plus size={16} /> Nuovo mezzo
                </Link>
              </>
            )}
          </div>
        }
      />
      <Flash msg={sp.msg} />
      {sp.errore && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-md bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
          <TriangleAlert size={16} /> {sp.errore.slice(0, 200)}
        </p>
      )}
      {mezzi.length === 0 ? (
        <div className="card">
          <EmptyState icon={Ship} title="Nessun mezzo inserito" text="Aggiungi il primo: marchio, modello, prezzo e qualche foto. Quando lo pubblichi compare sul sito." action={scrivi ? <Link href="/mezzi/nuovo" className="btn-primary">Aggiungi il primo mezzo</Link> : undefined} />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {mezzi.map((m) => (
            <li key={m.id} className="card flex flex-col overflow-hidden">
              <Link href={`/mezzi/${m.id}`} className="block">
                {m.foto[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/media/${m.foto[0]}`} alt="" className="aspect-[16/10] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/10] w-full items-center justify-center bg-navy/[.06] text-ink-faint">
                    <Ship size={32} />
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TONO[m.stato as StatoMezzo]}>{STATO_UI[m.stato as StatoMezzo]}</Badge>
                  <span className="text-[12px] font-semibold text-gold">{CONDIZIONI.find((c) => c.id === m.condizione)?.nome}</span>
                </div>
                <Link href={`/mezzi/${m.id}`} className="font-display text-[16px] font-semibold leading-tight hover:underline">
                  {getMarchio(m.marca)?.nome ?? m.marca} {m.modello}
                </Link>
                <p className="text-[13px] text-ink-soft">
                  {nomeCategoria(m.categoria)}
                  {m.anno ? ` · ${m.anno}` : ""} · {euro(m.prezzo)}
                </p>
                {scrivi && (
                  <form action={statoMezzoAction} className="mt-auto flex flex-wrap gap-2 pt-2">
                    <input type="hidden" name="id" value={m.id} />
                    {m.stato !== "PUBBLICATO" && (
                      <button name="to" value="PUBBLICATO" className="btn-primary btn-sm">
                        Metti online
                      </button>
                    )}
                    {m.stato === "PUBBLICATO" && (
                      <>
                        <button name="to" value="VENDUTO" className="btn-gold btn-sm">
                          Venduto
                        </button>
                        <button name="to" value="BOZZA" className="btn-ghost btn-sm">
                          Togli dal sito
                        </button>
                      </>
                    )}
                    {m.stato === "VENDUTO" && (
                      <button name="to" value="BOZZA" className="btn-ghost btn-sm">
                        Togli dal sito
                      </button>
                    )}
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
