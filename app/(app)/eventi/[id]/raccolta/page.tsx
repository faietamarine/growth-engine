import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft, UserPlus } from "lucide-react";
import { db } from "@/db/client";
import { campaigns, events, leads } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { tipoOrDefault } from "@/lib/events/catalog";
import { FASCE_BUDGET, TEMPI_SERVICE, TEMPI_VENDITA } from "@/lib/leads/validation";
import { ActionForm, Campo } from "@/components/ui/action-form";
import { raccogliContatto } from "../../actions";

export const metadata = { title: "Raccolta contatti" };
export const dynamic = "force-dynamic";

/** Pagina per il tablet dello staff: un contatto dopo l'altro, il form si svuota dopo ogni salvataggio. */
export default async function RaccoltaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser("eventi:scrivi");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const e = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!e) notFound();
  const camp = e.campaignId ? await db.query.campaigns.findFirst({ where: eq(campaigns.id, e.campaignId), columns: { reparto: true } }) : null;
  const tipo = tipoOrDefault(e.type);
  const reparto = camp?.reparto ?? tipo.reparto;
  const tempi = reparto === "SERVICE" ? TEMPI_SERVICE : TEMPI_VENDITA;
  const raccolti = (await db.select({ id: leads.id }).from(leads).where(and(eq(leads.eventId, id), eq(leads.onSite, true)))).length;
  const sel = (name: string, opz: readonly string[]) => (
    <select id={name} name={name} className="input" defaultValue="">
      <option value="">—</option>
      {opz.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  );

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/eventi/${id}`} className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> {e.name}
      </Link>
      <h1 className="font-display text-[22px] font-semibold">Nuovo contatto</h1>
      <p className="mb-4 text-[13px] text-ink-soft">
        Raccolti finora sul posto: <span className="num font-semibold text-ink">{raccolti}</span>. Gli iscritti già registrati non vanno reinseriti: segnali presenti dalla pagina dell&apos;evento.
      </p>
      {e.status === "CONCLUSO" && <p className="mb-3 rounded-md bg-warn/10 px-3 py-2 text-[13px] text-warn">L&apos;evento risulta svolto: usa questa pagina solo per recuperare contatti presi a mano durante la giornata.</p>}
      <ActionForm action={raccogliContatto.bind(null, id)} submit="Salva e passa al prossimo" icon={<UserPlus size={16} />} resetOnOk>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <Campo id="nome" label="Nome">
            <input id="nome" name="nome" className="input" required minLength={2} maxLength={60} autoComplete="off" autoFocus />
          </Campo>
          <Campo id="cognome" label="Cognome" optional>
            <input id="cognome" name="cognome" className="input" maxLength={60} autoComplete="off" />
          </Campo>
          <Campo id="telefono" label="Telefono">
            <input id="telefono" name="telefono" type="tel" inputMode="tel" className="input" required maxLength={30} autoComplete="off" />
          </Campo>
          <Campo id="email" label="Email" optional>
            <input id="email" name="email" type="email" inputMode="email" className="input" maxLength={120} autoComplete="off" />
          </Campo>
          {tipo.key === "evento-b2b" && (
            <Campo id="azienda" label="Azienda" optional>
              <input id="azienda" name="azienda" className="input" maxLength={120} autoComplete="off" />
            </Campo>
          )}
          <Campo id="interesse" label="Interesse">
            {sel("interesse", tipo.interessi)}
          </Campo>
          <Campo id="tempistica" label="Quando">
            {sel("tempistica", tempi)}
          </Campo>
          {reparto !== "SERVICE" && (
            <Campo id="budgetFascia" label="Budget">
              {sel("budgetFascia", Object.keys(FASCE_BUDGET))}
            </Campo>
          )}
          <Campo id="zona" label="Zona / porto" optional>
            <input id="zona" name="zona" className="input" maxLength={80} autoComplete="off" />
          </Campo>
          <div className="sm:col-span-2">
            <Campo id="messaggio" label="Note del venditore" optional help="Barca vista, richieste, prossimo passo concordato.">
              <textarea id="messaggio" name="messaggio" rows={3} maxLength={1000} className="input" />
            </Campo>
          </div>
        </div>
        <fieldset className="space-y-2 rounded-md bg-ink/[.03] p-3 text-[13px]">
          <legend className="sr-only">Consensi</legend>
          <p className="text-[12.5px] text-ink-soft">Fai leggere l&apos;informativa al cliente e fagli spuntare le caselle: il consenso deve essere suo.</p>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="consensoPrivacy" required className="mt-0.5 h-4 w-4 accent-navy" />
            <span>
              Ho letto l&apos;
              <a href="/l/privacy" target="_blank" className="font-semibold text-navy underline">
                informativa privacy
              </a>{" "}
              e acconsento a essere ricontattato per questa richiesta.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="consensoMarketing" className="mt-0.5 h-4 w-4 accent-navy" />
            <span>Voglio ricevere offerte e novità (facoltativo).</span>
          </label>
        </fieldset>
      </ActionForm>
    </div>
  );
}
