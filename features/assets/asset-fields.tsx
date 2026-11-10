import { Campo } from "@/components/ui/action-form";
import { TIPI_ASSET } from "@/lib/assets/catalog";
import type { Asset } from "@/db/schema";

type Opz = { id: string; name: string };

export function AssetFields({ a, campagne, utenti }: { a?: Partial<Asset>; campagne: Opz[]; utenti: Opz[] }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Campo id="title" label="Titolo">
          <input id="title" name="title" className="input" required minLength={3} maxLength={160} defaultValue={a?.title} placeholder="Es. Carosello 5 slide Joker Clubman" />
        </Campo>
      </div>
      <Campo id="type" label="Tipo">
        <select id="type" name="type" className="input" required defaultValue={a?.type ?? ""}>
          <option value="" disabled>
            Scegli…
          </option>
          {TIPI_ASSET.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Campo>
      <Campo id="campaignId" label="Campagna" optional>
        <select id="campaignId" name="campaignId" className="input" defaultValue={a?.campaignId ?? ""}>
          <option value="">Nessuna</option>
          {campagne.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="authorId" label="Autore">
        <select id="authorId" name="authorId" className="input" defaultValue={a?.authorId ?? ""}>
          <option value="">Io</option>
          {utenti.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="dueDate" label="Scadenza" optional>
        <input id="dueDate" name="dueDate" type="date" className="input" defaultValue={a?.dueDate ?? ""} />
      </Campo>
      <div className="sm:col-span-2">
        <Campo id="fileUrl" label="Link al file" optional help="Drive, Dropbox, Canva… solo indirizzi https. Se cambi il file di un asset in revisione nasce una nuova versione.">
          <input id="fileUrl" name="fileUrl" type="url" inputMode="url" className="input" maxLength={500} defaultValue={a?.fileUrl ?? ""} placeholder="https://" />
        </Campo>
      </div>
      <div className="sm:col-span-2">
        <Campo id="notes" label="Testo o note" optional help="Per headline, testi, email e messaggi scrivi qui il testo vero e proprio.">
          <textarea id="notes" name="notes" rows={5} maxLength={3000} className="input" defaultValue={a?.notes} />
        </Campo>
      </div>
      <div className="sm:col-span-2">
        <Campo id="aiPrompt" label="Prompt AI per immagini o video" optional help="La descrizione da dare a un generatore di immagini o video, così chiunque può rifarlo uguale.">
          <textarea id="aiPrompt" name="aiPrompt" rows={3} maxLength={3000} className="input" defaultValue={a?.aiPrompt} />
        </Campo>
      </div>
    </div>
  );
}
