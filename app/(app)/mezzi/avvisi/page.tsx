import Link from "next/link";
import { ArrowLeft, Megaphone, Plus, Save, Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { elencoMezzi, elencoPromo } from "@/features/vetrina/service";
import { PromoFields } from "@/features/vetrina/promo-fields";
import { getMarchio } from "@/lib/brands/catalog";
import { inCorso } from "@/lib/vetrina/promo";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { creaPromoAction, eliminaPromoAction, salvaPromoAction } from "../actions";

export const metadata = { title: "Avvisi e promo" };
export const dynamic = "force-dynamic";

export default async function AvvisiPage() {
  await requireUser("contenuti:scrivi");
  const [promo, mezzi] = await Promise.all([elencoPromo(), elencoMezzi()]);
  const opz = mezzi.filter((m) => m.stato === "PUBBLICATO").map((m) => ({ id: m.id, nome: `${getMarchio(m.marca)?.nome ?? m.marca} ${m.modello}` }));
  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <PageHeader title="Avvisi e promo" subtitle="Piccolo popup sul sito: compare da solo nelle date che scegli e sparisce alla scadenza" />
      <div className="mx-auto max-w-3xl space-y-6">
        <section>
          <h2 className="mb-2 font-display text-[16px] font-semibold">Nuovo avviso</h2>
          <ActionForm action={creaPromoAction} submit="Salva avviso" icon={<Plus size={16} />} resetOnOk>
            <PromoFields mezzi={opz} prefisso="nuovo" />
          </ActionForm>
          <p className="mt-2 text-[12px] text-ink-faint">Se ci sono più avvisi nello stesso periodo, il sito ne mostra uno solo: quello che parte più tardi.</p>
        </section>
        <section className="space-y-4">
          <h2 className="font-display text-[16px] font-semibold">Avvisi inseriti</h2>
          {promo.length === 0 && (
            <p className="card flex items-center gap-2 p-5 text-sm text-ink-soft">
              <Megaphone size={16} /> Nessun avviso. Creane uno qui sopra.
            </p>
          )}
          {promo.map((p) => (
            <details key={p.id} className="card p-0" open={inCorso(p)}>
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-4">
                <span className="font-semibold">{p.titolo}</span>
                {inCorso(p) ? <Badge tone="ok">Online ora</Badge> : <Badge tone="neutral">{!p.attivo ? "Spento" : p.fine < new Date().toISOString().slice(0, 10) ? "Scaduto" : "In programma"}</Badge>}
                <span className="text-[12px] text-ink-faint">
                  {p.inizio.split("-").reverse().join("/")} → {p.fine.split("-").reverse().join("/")}
                </span>
              </summary>
              <div className="space-y-3 border-t border-line p-4">
                <ActionForm action={salvaPromoAction.bind(null, p.id)} submit="Salva modifiche" icon={<Save size={16} />} className="space-y-4">
                  <PromoFields p={p} mezzi={opz} prefisso={p.id} />
                </ActionForm>
                <form action={eliminaPromoAction} className="flex justify-end">
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton className="btn bg-danger text-white hover:opacity-90 disabled:opacity-60" confirm="Eliminare questo avviso?">
                    <Trash2 size={15} /> Elimina
                  </SubmitButton>
                </form>
              </div>
            </details>
          ))}
        </section>
      </div>
    </>
  );
}
