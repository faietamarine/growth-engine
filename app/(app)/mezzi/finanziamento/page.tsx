import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getVetrinaSettings } from "@/features/vetrina/service";
import { ActionForm, Campo } from "@/components/ui/action-form";
import { PageHeader } from "@/components/layout/page-header";
import { CalcolatoreRata } from "@/features/vetrina/calcolatore-rata";
import { salvaFinanziamentoAction } from "../actions";

export const metadata = { title: "Finanziamento" };
export const dynamic = "force-dynamic";

export default async function FinanziamentoPage() {
  await requireUser("contenuti:scrivi");
  const f = (await getVetrinaSettings()).finanziamento;
  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <PageHeader title="Finanziamento" subtitle="Sul sito il cliente risponde a 3 domande (acconto, rata, durata); qui hai il calcolatore per formulare la rata al telefono o in sede" />
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="card space-y-2 p-5">
          <p className="font-display text-[16px] font-semibold">Calcolatore rata</p>
          <CalcolatoreRata f={f} />
        </div>
        <div className="card p-5 text-[13px] leading-relaxed text-ink-soft">
          <p className="font-semibold text-ink">Come funziona sul sito</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>Nella scheda dei mezzi compare &quot;Vuoi finanziarlo?&quot;, <b>senza rate né tassi</b>: il mezzo si finanzia solo in sede.</li>
            <li>Il cliente indica acconto, rata che vorrebbe e durata: nei Lead trovi il bollino &quot;Finanziamento&quot; e le risposte. Richiamalo con la proposta.</li>
            <li>Per legge restano il nome e il contatto della finanziaria e l&apos;avviso &quot;Attenzione! Prendere in prestito denaro costa denaro&quot;.</li>
            <li>TAN e spese servono solo al calcolatore qui sopra: copiali dal foglio dell&apos;offerta della finanziaria.</li>
          </ul>
        </div>
        <ActionForm action={salvaFinanziamentoAction} submit="Salva" icon={<Save size={16} />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-[14px] font-semibold sm:col-span-2">
              <input type="checkbox" name="attivo" defaultChecked={f.attivo} /> Proponi il finanziamento sul sito (domande al cliente, nessuna rata mostrata)
            </label>
            <Campo id="finanziaria" label="Finanziaria (ragione sociale)">
              <input id="finanziaria" name="finanziaria" className="input" defaultValue={f.finanziaria} placeholder="Es. Nome Finanziaria S.p.A." />
            </Campo>
            <Campo id="contatti" label="Contatto della finanziaria" help="Telefono o sito: è obbligatorio indicarlo.">
              <input id="contatti" name="contatti" className="input" defaultValue={f.contatti} />
            </Campo>
            <Campo id="tan" label="TAN fisso (%), per il calcolatore" optional>
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
            <Campo id="validoFino" label="Proposta valida fino al" optional help="Dopo questa data il riquadro sparisce dal sito.">
              <input id="validoFino" name="validoFino" type="date" className="input" defaultValue={f.validoFino} />
            </Campo>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
