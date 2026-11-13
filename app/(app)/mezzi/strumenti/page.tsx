import Link from "next/link";
import { ArrowLeft, Download, FileSpreadsheet, Images, Percent } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { variaPrezzi } from "@/features/vetrina/service";
import { MARCHI } from "@/lib/brands/catalog";
import { CONDIZIONI, euro } from "@/lib/vetrina/catalog";
import { COLONNE_CSV } from "@/lib/vetrina/strumenti";
import { PageHeader } from "@/components/layout/page-header";
import { Flash } from "@/components/ui/flash";
import { SubmitButton } from "@/components/ui/submit-button";
import { FotoCatalogo } from "@/components/vetrina/foto-catalogo";
import { CsvFile } from "@/components/vetrina/csv-file";
import { importaCsvAction, prezziAction } from "./actions";

export const metadata = { title: "Strumenti vetrina" };
export const dynamic = "force-dynamic";

type SP = { msg?: string; errore?: string; marca?: string; condizione?: string; tipo?: string; valore?: string };

export default async function StrumentiPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("contenuti:scrivi");
  const sp = await searchParams;
  const admin = can(user.role, "impostazioni:gestisci");
  const valore = Number(sp.valore);
  const anteprima = sp.tipo && Number.isFinite(valore) && valore !== 0 ? await variaPrezzi({ marca: sp.marca || undefined, condizione: sp.condizione || undefined }, { tipo: sp.tipo === "IMPORTO" ? "IMPORTO" : "PERCENTUALE", valore }, null) : null;

  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <PageHeader title="Strumenti vetrina" subtitle="Per lavorare in blocco: prezzi, foto, importazione e copia dei dati" />
      <Flash msg={sp.msg} />
      {sp.errore && <p role="alert" className="mb-4 rounded-md bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">{sp.errore.slice(0, 600)}</p>}

      <div className="mx-auto grid max-w-4xl gap-4">
        <section id="prezzi" className="card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Percent size={17} /> Prezzi di gruppo</h2>
          <p className="mt-1 text-[13px] text-ink-soft">Cambia i prezzi di molti mezzi insieme (nuovo listino, promozione). Prima vedi l&apos;anteprima, poi confermi. I venduti e i mezzi &quot;su richiesta&quot; non cambiano. I prezzi sono arrotondati ai 10 €.</p>
          <form action={prezziAction} className="mt-3 grid gap-3 sm:grid-cols-4">
            <label className="text-[13px] font-medium">Marchio
              <select name="marca" className="input mt-1" defaultValue={sp.marca ?? ""}>
                <option value="">Tutti</option>
                {MARCHI.map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
              </select>
            </label>
            <label className="text-[13px] font-medium">Sezione
              <select name="condizione" className="input mt-1" defaultValue={sp.condizione ?? ""}>
                <option value="">Tutte</option>
                {CONDIZIONI.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <label className="text-[13px] font-medium">Tipo
              <select name="tipo" className="input mt-1" defaultValue={sp.tipo ?? "PERCENTUALE"}>
                <option value="PERCENTUALE">Percentuale (%)</option>
                <option value="IMPORTO">Importo (€)</option>
              </select>
            </label>
            <label className="text-[13px] font-medium">Variazione <span className="font-normal text-ink-faint">(− per ribassare)</span>
              <input name="valore" className="input mt-1" inputMode="decimal" placeholder="es. 3 oppure -5" defaultValue={sp.valore ?? ""} required />
            </label>
            <div className="sm:col-span-4"><button name="azione" value="anteprima" className="btn-ghost">Vedi l&apos;anteprima</button></div>
          </form>
          {anteprima && (
            <div className="mt-4">
              {anteprima.length ? (
                <>
                  <ul className="max-h-72 divide-y divide-line overflow-auto rounded-md border border-line text-[13px]">
                    {anteprima.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                        <span className="truncate">{c.nome}</span>
                        <span className="num whitespace-nowrap">{euro(c.prima)} → <b>{euro(c.dopo)}</b></span>
                      </li>
                    ))}
                  </ul>
                  <form action={prezziAction} className="mt-3">
                    <input type="hidden" name="marca" value={sp.marca ?? ""} />
                    <input type="hidden" name="condizione" value={sp.condizione ?? ""} />
                    <input type="hidden" name="tipo" value={sp.tipo} />
                    <input type="hidden" name="valore" value={sp.valore} />
                    <input type="hidden" name="azione" value="applica" />
                    <SubmitButton confirm={`Cambio il prezzo di ${anteprima.length} mezzi. Procedo?`}>Applica a {anteprima.length} mezzi</SubmitButton>
                  </form>
                </>
              ) : (
                <p className="text-[13px] text-ink-soft">Nessun mezzo con prezzo corrisponde a questi filtri.</p>
              )}
            </div>
          )}
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Images size={17} /> Foto dei modelli a catalogo in blocco</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Scegli tutte le foto insieme: ogni foto va al mezzo giusto in base al <b>nome del file</b>, scritto come <code>marchio-modello.jpg</code> (maiuscole e spazi non contano). Per più foto dello stesso modello aggiungi un numero: <code>capelli-tempest-700-2.jpg</code>. Se il nome è solo il modello (<code>f150.jpg</code>) funziona quando è unico.
            Esempi: <code>jeanneau-merry-fisher-695.jpg</code>, <code>yamaha-f250.jpg</code>, <code>capelli-tempest-700-3.jpg</code>. Fino a 300 foto per volta, massimo 12 per mezzo.
          </p>
          <div className="mt-3"><FotoCatalogo /></div>
        </section>

        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><FileSpreadsheet size={17} /> Importa mezzi da Excel</h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            In Excel scegli <b>Salva con nome → CSV</b>. La prima riga deve avere queste colonne: <code>{COLONNE_CSV.join("; ")}</code>. Marchio, categoria (Gommone, Open, Cabinato, Moto d&apos;acqua, Fuoribordo) e condizione (Pronta consegna, Usato, A catalogo) si scrivono per esteso. I mezzi entrano come <b>bozze</b> (le foto si aggiungono dopo); i modelli a catalogo vanno online.
          </p>
          <p className="mt-2"><a href="/mezzi/strumenti/modello-csv" className="inline-flex items-center gap-1 text-[13px] font-semibold text-info underline"><Download size={14} /> Scarica il file di esempio</a></p>
          <form action={importaCsvAction} className="mt-3 space-y-3">
            <CsvFile />
            <SubmitButton confirm="Importo i mezzi del file?">Importa</SubmitButton>
          </form>
        </section>

        {admin && (
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Download size={17} /> Copia di sicurezza dei dati</h2>
            <p className="mt-1 text-[13px] text-ink-soft">Scarica un file con mezzi, avvisi, impostazioni della vetrina e lead. Le foto e i PDF non sono incluse (sono sul database online). Conservalo in un posto sicuro: contiene dati personali dei clienti.</p>
            <p className="mt-3"><a href="/api/backup" className="btn-ghost"><Download size={16} /> Scarica la copia</a></p>
          </section>
        )}
      </div>
    </>
  );
}
