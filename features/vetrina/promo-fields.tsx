import { Campo } from "@/components/ui/action-form";
import { CTA_TIPI, oggiRoma } from "@/lib/vetrina/promo";
import type { Promo } from "@/db/schema";

export function PromoFields({ p, mezzi, prefisso }: { p?: Partial<Promo>; mezzi: { id: string; nome: string }[]; prefisso: string }) {
  const i = (n: string) => `${prefisso}-${n}`;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Campo id={i("titolo")} label="Titolo" help="Max 70 caratteri">
          <input id={i("titolo")} name="titolo" className="input" required maxLength={70} defaultValue={p?.titolo} placeholder="Black Friday in cantiere" />
        </Campo>
      </div>
      <div className="sm:col-span-2">
        <Campo id={i("testo")} label="Testo" optional help="Max 220 caratteri">
          <textarea id={i("testo")} name="testo" rows={3} maxLength={220} className="input py-2" defaultValue={p?.testo} placeholder="Solo fino a domenica: accessori inclusi sui gommoni in pronta consegna." />
        </Campo>
      </div>
      <Campo id={i("inizio")} label="Da">
        <input id={i("inizio")} name="inizio" type="date" className="input" required defaultValue={p?.inizio ?? oggiRoma()} />
      </Campo>
      <Campo id={i("fine")} label="Fino a (compreso)">
        <input id={i("fine")} name="fine" type="date" className="input" required defaultValue={p?.fine} />
      </Campo>
      <Campo id={i("ctaTipo")} label="Pulsante">
        <select id={i("ctaTipo")} name="ctaTipo" className="input" defaultValue={p?.ctaTipo ?? "VISITA"}>
          {CTA_TIPI.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id={i("ctaTesto")} label="Scritta del pulsante" optional help="Se vuota, la scelgo io">
        <input id={i("ctaTesto")} name="ctaTesto" className="input" maxLength={30} defaultValue={p?.ctaTesto} placeholder="Approfittane" />
      </Campo>
      <div className="sm:col-span-2">
        <Campo id={i("mezzoId")} label="Mezzo (solo se il pulsante apre un mezzo)" optional>
          <select id={i("mezzoId")} name="mezzoId" className="input" defaultValue={p?.mezzoId ?? ""}>
            <option value="">—</option>
            {mezzi.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
        <input type="checkbox" name="attivo" defaultChecked={p?.attivo ?? true} className="h-4 w-4" /> Attivo (se tolto, l&apos;avviso non compare anche dentro le date)
      </label>
    </div>
  );
}
