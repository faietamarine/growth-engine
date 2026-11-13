import { Campo } from "@/components/ui/action-form";
import { MARCHI } from "@/lib/brands/catalog";
import { CATEGORIE, CONDIZIONI, MAX_FOTO, STATI_MEZZO, STATO_UI } from "@/lib/vetrina/catalog";
import { FotoUploader } from "@/components/vetrina/foto-uploader";
import type { Vehicle } from "@/db/schema";

export function MezzoFields({ m }: { m?: Partial<Vehicle> }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
      <Campo id="marca" label="Marchio">
        <select id="marca" name="marca" className="input" required defaultValue={m?.marca ?? ""}>
          <option value="" disabled>
            Scegli…
          </option>
          {MARCHI.map((x) => (
            <option key={x.slug} value={x.slug}>
              {x.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="modello" label="Modello">
        <input id="modello" name="modello" className="input" required maxLength={80} defaultValue={m?.modello} placeholder="Es. Clubman 24" />
      </Campo>
      <Campo id="categoria" label="Categoria" help="Compare nelle icone «Cosa stai cercando»">
        <select id="categoria" name="categoria" className="input" required defaultValue={m?.categoria ?? ""}>
          <option value="" disabled>
            Scegli…
          </option>
          {CATEGORIE.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="condizione" label="Dove lo mostro">
        <select id="condizione" name="condizione" className="input" required defaultValue={m?.condizione ?? ""}>
          <option value="" disabled>
            Scegli…
          </option>
          {CONDIZIONI.map((c) => (
            <option key={c.id} value={c.id}>
              {c.titolo}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="anno" label="Anno" optional help="Obbligatorio per l'usato">
        <input id="anno" name="anno" inputMode="numeric" className="input" defaultValue={m?.anno ?? ""} placeholder="2024" />
      </Campo>
      <Campo id="prezzo" label="Prezzo in euro" optional help="Vuoto = «Su richiesta»">
        <input id="prezzo" name="prezzo" inputMode="numeric" className="input" defaultValue={m?.prezzo ?? ""} placeholder="39000" />
      </Campo>
      <Campo id="lunghezza" label="Lunghezza in metri" optional>
        <input id="lunghezza" name="lunghezza" inputMode="decimal" className="input" defaultValue={m?.lunghezza ?? ""} placeholder="7,5" />
      </Campo>
      <Campo id="posti" label="Persone a bordo" optional>
        <input id="posti" name="posti" inputMode="numeric" className="input" defaultValue={m?.posti ?? ""} placeholder="8" />
      </Campo>
      <Campo id="motore" label="Motore" optional>
        <input id="motore" name="motore" className="input" maxLength={120} defaultValue={m?.motore} placeholder="Yamaha F150 4 tempi" />
      </Campo>
      <Campo id="ore" label="Ore motore" optional help="Per l'usato">
        <input id="ore" name="ore" inputMode="numeric" className="input" defaultValue={m?.ore ?? ""} placeholder="120" />
      </Campo>
      <div className="sm:col-span-2">
        <Campo id="descrizione" label="Descrizione" optional>
          <textarea id="descrizione" name="descrizione" rows={5} maxLength={4000} className="input py-2" defaultValue={m?.descrizione} placeholder="Come è tenuta, cosa include, perché è interessante…" />
        </Campo>
      </div>
      <div className="sm:col-span-2">
        <Campo id="dotazioni" label="Dotazioni" optional help="Una per riga">
          <textarea id="dotazioni" name="dotazioni" rows={4} className="input py-2" defaultValue={(m?.dotazioni ?? []).join("\n")} placeholder={"Prendisole di prua\nGPS plotter\nTendalino"} />
        </Campo>
      </div>
      <div className="sm:col-span-2">
        <span className="label">Foto (la prima è la copertina, fino a {MAX_FOTO})</span>
        <FotoUploader name="foto" iniziali={m?.foto ?? []} max={MAX_FOTO} />
      </div>
      <Campo id="stato" label="Stato">
        <select id="stato" name="stato" className="input" defaultValue={m?.stato ?? "BOZZA"}>
          {STATI_MEZZO.map((s) => (
            <option key={s} value={s}>
              {STATO_UI[s]}
            </option>
          ))}
        </select>
      </Campo>
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
        <input type="checkbox" name="inEvidenza" defaultChecked={m?.inEvidenza} className="h-4 w-4" /> In evidenza (compare per primo)
      </label>
    </div>
  );
}
