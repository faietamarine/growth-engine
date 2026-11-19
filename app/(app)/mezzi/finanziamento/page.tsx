import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getVetrinaSettings } from "@/features/vetrina/service";
import { ActionForm, Campo } from "@/components/ui/action-form";
import { PageHeader } from "@/components/layout/page-header";
import { esempioFinanziamento } from "@/lib/vetrina/finanziamento";
import { euro } from "@/lib/vetrina/catalog";
import { salvaFinanziamentoAction } from "../actions";

export const metadata = { title: "Finanziamento" };
export const dynamic = "force-dynamic";

export default async function FinanziamentoPage() {
  await requireUser("contenuti:scrivi");
  const f = (await getVetrinaSettings()).finanziamento;
  const prova = f.tan > 0 ? esempioFinanziamento(30000, f.anticipoPredefinito, f.durataPredefinita, f) : null;
  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <PageHeader title="Finanziamento" subtitle="L'esempio di rata che compare nella scheda dei mezzi, con i dati dell'offerta della vostra finanziaria" />
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="card text-[13px] leading-relaxed text-ink-soft">
          <p className="font-semibold text-ink">Prima di attivarlo</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>Copia TAN e spese <b>dal foglio dell&apos;offerta della finanziaria</b> (o dal suo simulatore) e fai controllare alla finanziaria un esempio calcolato qui.</li>
            <li>La legge sulla pubblicità del credito chiede: esempio rappresentativo completo, TAEG evidente quanto la rata, contatti del finanziatore e l&apos;avviso &quot;Attenzione! Prendere in prestito denaro costa denaro&quot;. Il sito li mostra già tutti.</li>
            <li>Quando l&apos;offerta cambia o scade, aggiorna i dati o togli la spunta: con la data di scadenza l&apos;esempio sparisce da solo.</li>
          </ul>
        </div>
        <ActionForm action={salvaFinanziamentoAction} submit="Salva" icon={<Save size={16} />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-[14px] font-semibold sm:col-span-2">
              <input type="checkbox" name="attivo" defaultChecked={f.attivo} /> Mostra l&apos;esempio di finanziamento sul sito
            </label>
            <Campo id="finanziaria" label="Finanziaria (ragione sociale)">
              <input id="finanziaria" name="finanziaria" className="input" defaultValue={f.finanziaria} placeholder="Es. Nome Finanziaria S.p.A." />
            </Campo>
            <Campo id="contatti" label="Contatto della finanziaria" help="Telefono o sito: è obbligatorio indicarlo.">
              <input id="contatti" name="contatti" className="input" defaultValue={f.contatti} />
            </Campo>
            <Campo id="tan" label="TAN fisso (%)">
              <input id="tan" name="tan" inputMode="decimal" className="input" defaultValue={f.tan || ""} placeholder="7,90" />
            </Campo>
            <Campo id="speseIstruttoria" label="Spese di istruttoria (€)">
              <input id="speseIstruttoria" name="speseIstruttoria" inputMode="decimal" className="input" defaultValue={f.speseIstruttoria} />
            </Campo>
            <Campo id="speseIncasso" label="Spese di incasso per rata (€)">
              <input id="speseIncasso" name="speseIncasso" inputMode="decimal" className="input" defaultValue={f.speseIncasso} />
            </Campo>
            <Campo id="impostaBollo" label="Imposta di bollo / sostitutiva (€)">
              <input id="impostaBollo" name="impostaBollo" inputMode="decimal" className="input" defaultValue={f.impostaBollo} />
            </Campo>
            <Campo id="durate" label="Durate proposte (mesi)" help="Separate da virgola, es. 24, 36, 48, 60, 72, 84">
              <input id="durate" name="durate" className="input" defaultValue={f.durate.join(", ")} />
            </Campo>
            <Campo id="durataPredefinita" label="Durata mostrata all'inizio (mesi)">
              <input id="durataPredefinita" name="durataPredefinita" inputMode="numeric" className="input" defaultValue={f.durataPredefinita} />
            </Campo>
            <Campo id="anticipoMinimo" label="Anticipo minimo (%)">
              <input id="anticipoMinimo" name="anticipoMinimo" inputMode="decimal" className="input" defaultValue={f.anticipoMinimo} />
            </Campo>
            <Campo id="anticipoPredefinito" label="Anticipo mostrato all'inizio (%)">
              <input id="anticipoPredefinito" name="anticipoPredefinito" inputMode="decimal" className="input" defaultValue={f.anticipoPredefinito} />
            </Campo>
            <Campo id="importoMinimo" label="Importo minimo finanziabile (€)">
              <input id="importoMinimo" name="importoMinimo" inputMode="numeric" className="input" defaultValue={f.importoMinimo} />
            </Campo>
            <Campo id="validoFino" label="Offerta valida fino al" optional>
              <input id="validoFino" name="validoFino" type="date" className="input" defaultValue={f.validoFino} />
            </Campo>
          </div>
        </ActionForm>
        {prova && (
          <div className="card text-[13px]">
            <p className="font-semibold">Controllo con la finanziaria: mezzo da 30.000 €</p>
            <p className="mt-1 text-ink-soft">
              Anticipo {euro(prova.anticipo)} · credito {euro(prova.credito)} · {prova.mesi} rate da {prova.rata.toLocaleString("it-IT", { minimumFractionDigits: 2 })} € · TAN {prova.tan.toLocaleString("it-IT")}% · TAEG {prova.taeg.toLocaleString("it-IT")}% · totale dovuto {prova.totaleDovuto.toLocaleString("it-IT", { minimumFractionDigits: 2 })} €
            </p>
            <p className="mt-1 text-ink-faint">Se i numeri della finanziaria per lo stesso caso sono diversi, correggi le spese qui sopra.</p>
          </div>
        )}
      </div>
    </>
  );
}
