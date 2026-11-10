import { Campo } from "@/components/ui/action-form";
import { TIPI_EVENTO } from "@/lib/events/catalog";
import type { EventRow } from "@/db/schema";

type Opz = { id: string; name: string };

/** Campi del form evento (nuovo e modifica). Con evento svolto si modificano solo spesa e note. */
export function EventFields({ e, tipo, campagne, svolto }: { e?: Partial<EventRow>; tipo: string; campagne: Opz[]; svolto?: boolean }) {
  const ro = svolto ? { readOnly: true, "aria-readonly": true } : {};
  return (
    <>
      {svolto && <p className="rounded-md bg-info/10 px-3 py-2 text-[13px] text-info">Evento svolto: puoi aggiornare solo la spesa effettiva e le note.</p>}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo id="name" label="Nome dell'evento">
            <input id="name" name="name" className="input" required minLength={3} maxLength={120} defaultValue={e?.name} placeholder="Es. Open Day Marina di Pescara" {...ro} />
          </Campo>
        </div>
        <Campo id="type" label="Tipo">
          <select id="type" name="type" className="input" defaultValue={tipo} disabled={svolto}>
            {TIPI_EVENTO.map((t) => (
              <option key={t.key} value={t.key}>
                {t.nome}
              </option>
            ))}
          </select>
          {svolto && <input type="hidden" name="type" value={tipo} />}
        </Campo>
        <Campo id="campaignId" label="Campagna" optional help="I lead dell'evento vengono attribuiti a questa campagna.">
          <select id="campaignId" name="campaignId" className="input" defaultValue={e?.campaignId ?? ""} disabled={svolto}>
            <option value="">Nessuna</option>
            {campagne.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {svolto && <input type="hidden" name="campaignId" value={e?.campaignId ?? ""} />}
        </Campo>
        <Campo id="date" label="Data">
          <input id="date" name="date" type="date" className="input" required defaultValue={e?.date} {...ro} />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo id="time" label="Inizio">
            <input id="time" name="time" type="time" className="input" required defaultValue={e?.time ?? "10:00"} {...ro} />
          </Campo>
          <Campo id="endTime" label="Fine">
            <input id="endTime" name="endTime" type="time" className="input" required defaultValue={e?.endTime ?? "18:00"} {...ro} />
          </Campo>
        </div>
        <div className="sm:col-span-2">
          <Campo id="venue" label="Luogo" help="Per i webinar scrivi «Online» e la piattaforma.">
            <input id="venue" name="venue" className="input" required maxLength={160} defaultValue={e?.venue} placeholder="Es. Porto Turistico Marina di Pescara" {...ro} />
          </Campo>
        </div>
        <Campo id="capacity" label="Posti disponibili" help="0 = senza limite.">
          <input id="capacity" name="capacity" type="number" min={0} step={1} inputMode="numeric" className="input num" required defaultValue={e?.capacity ?? 0} {...ro} />
        </Campo>
        <Campo id="budget" label="Budget previsto (€)">
          <input id="budget" name="budget" type="number" min={0} step={1} inputMode="numeric" className="input num" required defaultValue={e?.budget ?? 0} {...ro} />
        </Campo>
        <Campo id="spent" label="Spesa effettiva (€)" help="Serve per il costo per lead nel report.">
          <input id="spent" name="spent" type="number" min={0} step={1} inputMode="numeric" className="input num" defaultValue={e?.spent ?? 0} />
        </Campo>
        <div className="sm:col-span-2">
          <Campo id="objective" label="Obiettivo" optional>
            <textarea id="objective" name="objective" rows={2} maxLength={400} className="input" defaultValue={e?.objective} {...ro} />
          </Campo>
        </div>
        <div className="sm:col-span-2">
          <Campo id="notes" label="Note interne" optional>
            <textarea id="notes" name="notes" rows={3} maxLength={2000} className="input" defaultValue={e?.notes} />
          </Campo>
        </div>
      </div>
    </>
  );
}
