import type { Evento, Post } from "@/db/schema";
import { Campo } from "@/components/ui/action-form";
import { FotoUploader } from "@/components/vetrina/foto-uploader";
import { TIPI_EVENTO } from "@/lib/vetrina/contenuti";

/** Campi dell'articolo del blog (nuovo e modifica). */
export function PostFields({ p }: { p?: Post | null }) {
  return (
    <div className="space-y-4">
      <Campo id="titolo" label="Titolo">
        <input id="titolo" name="titolo" className="input" required maxLength={120} defaultValue={p?.titolo} placeholder="Come scegliere il primo gommone" />
      </Campo>
      <Campo id="sommario" label="Riassunto" optional help="Due righe che compaiono nell'elenco e su Google. Se lo lasci vuoto usiamo l'inizio del testo.">
        <textarea id="sommario" name="sommario" className="input" rows={2} maxLength={280} defaultValue={p?.sommario} />
      </Campo>
      <Campo id="testo" label="Testo" help='Riga vuota = nuovo paragrafo. Una riga che comincia con "## " diventa un sottotitolo; righe che cominciano con "- " diventano un elenco.'>
        <textarea id="testo" name="testo" className="input font-mono text-[13px]" rows={16} maxLength={20000} defaultValue={p?.testo} />
      </Campo>
      <div>
        <span className="label">Foto di copertina</span>
        <p className="mb-2 text-[12px] text-ink-faint">Orizzontale, almeno 1200 pixel di larghezza. Usa solo foto vostre o dei marchi che rappresentate.</p>
        <FotoUploader name="foto" iniziali={p?.foto ? [p.foto] : []} max={1} singola />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="stato" label="Stato">
          <select id="stato" name="stato" className="input" defaultValue={p?.stato ?? "BOZZA"}>
            <option value="BOZZA">Bozza (non visibile)</option>
            <option value="PUBBLICATO">Pubblicato sul sito</option>
          </select>
        </Campo>
        <Campo id="pubblicatoIl" label="Data di pubblicazione" optional help="Vuota = oggi, alla prima pubblicazione.">
          <input id="pubblicatoIl" name="pubblicatoIl" type="date" className="input" defaultValue={p?.pubblicatoIl ?? ""} />
        </Campo>
      </div>
    </div>
  );
}

/** Campi di un evento o di una giornata di prove in mare. */
export function EventoFields({ e }: { e?: Evento | null }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="tipo" label="Tipo">
          <select id="tipo" name="tipo" className="input" defaultValue={e?.tipo ?? "PROVE_IN_MARE"}>
            {TIPI_EVENTO.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="titolo" label="Titolo">
          <input id="titolo" name="titolo" className="input" required maxLength={120} defaultValue={e?.titolo} placeholder="Giornata prove in mare Joker Boat" />
        </Campo>
        <Campo id="data" label="Giorno">
          <input id="data" name="data" type="date" className="input" required defaultValue={e?.data} />
        </Campo>
        <Campo id="dataFine" label="Ultimo giorno" optional help="Solo per eventi di più giorni (es. un salone).">
          <input id="dataFine" name="dataFine" type="date" className="input" defaultValue={e?.dataFine ?? ""} />
        </Campo>
        <Campo id="orario" label="Orario" optional>
          <input id="orario" name="orario" className="input" maxLength={40} defaultValue={e?.orario} placeholder="10:00 – 18:00" />
        </Campo>
        <Campo id="luogo" label="Luogo" optional>
          <input id="luogo" name="luogo" className="input" maxLength={160} defaultValue={e?.luogo} placeholder="Porto turistico Marina di Pescara" />
        </Campo>
        <Campo id="posti" label="Posti disponibili (persone)" optional help="Vuoto = senza limite. A posti esauriti il modulo di iscrizione si chiude da solo.">
          <input id="posti" name="posti" type="number" min={1} className="input" defaultValue={e?.posti ?? ""} />
        </Campo>
        <Campo id="stato" label="Stato">
          <select id="stato" name="stato" className="input" defaultValue={e?.stato ?? "BOZZA"}>
            <option value="BOZZA">Bozza (non visibile)</option>
            <option value="PUBBLICATO">Pubblicato sul sito</option>
          </select>
        </Campo>
      </div>
      <Campo id="descrizione" label="Descrizione" optional help="Riga vuota = nuovo paragrafo.">
        <textarea id="descrizione" name="descrizione" className="input" rows={6} maxLength={6000} defaultValue={e?.descrizione} />
      </Campo>
      <Campo id="mezzi" label="Mezzi in prova" optional help="Uno per riga, es. Joker Boat Clubman 24 con Yamaha F200.">
        <textarea id="mezzi" name="mezzi" className="input" rows={4} maxLength={2000} defaultValue={e?.mezzi} />
      </Campo>
      <div>
        <span className="label">Foto</span>
        <FotoUploader name="foto" iniziali={e?.foto ? [e.foto] : []} max={1} singola />
      </div>
    </div>
  );
}
