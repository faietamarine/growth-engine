import { Campo } from "@/components/ui/action-form";
import { TASK_STATUS, type Task } from "@/db/schema";
import { TIPI_ATTIVITA } from "@/lib/calendar/logic";
import { TASK_STATUS_UI } from "@/lib/labels";

type Opz = { id: string; name: string };

export function TaskFields({ t, opz, ritorno }: { t?: Partial<Task>; opz: { utenti: Opz[]; campagne: Opz[]; eventi: Opz[]; attivita: { id: string; title: string; dueDate: string }[] }; ritorno: string }) {
  const select = (id: string, label: string, list: Opz[], def: string | null | undefined, vuoto = "Nessuna", optional = true) => (
    <Campo id={id} label={label} optional={optional}>
      <select id={id} name={id} className="input" defaultValue={def ?? ""}>
        <option value="">{vuoto}</option>
        {list.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </Campo>
  );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
      <input type="hidden" name="ritorno" value={ritorno} />
      <div className="sm:col-span-2">
        <Campo id="title" label="Attività">
          <input id="title" name="title" className="input" required minLength={3} maxLength={160} defaultValue={t?.title} placeholder="Es. Foto barche per il carosello" />
        </Campo>
      </div>
      <Campo id="kind" label="Tipo">
        <select id="kind" name="kind" className="input" defaultValue={t?.kind ?? "post"}>
          {TIPI_ATTIVITA.map((k) => (
            <option key={k.key} value={k.key}>
              {k.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="dueDate" label="Scadenza">
        <input id="dueDate" name="dueDate" type="date" className="input" required defaultValue={t?.dueDate} />
      </Campo>
      {select("assigneeId", "Responsabile", opz.utenti, t?.assigneeId, "Da assegnare")}
      <Campo id="status" label="Stato">
        <select id="status" name="status" className="input" defaultValue={t?.status ?? "DA_FARE"}>
          {TASK_STATUS.map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_UI[s].label}
            </option>
          ))}
        </select>
      </Campo>
      {select("campaignId", "Campagna", opz.campagne, t?.campaignId)}
      {select("eventId", "Evento", opz.eventi, t?.eventId, "Nessuno")}
      <div className="sm:col-span-2">
        {select(
          "dependsOnId",
          "Dipende da",
          opz.attivita.filter((a) => a.id !== t?.id).map((a) => ({ id: a.id, name: `${a.title} (${a.dueDate.split("-").reverse().join("/")})` })),
          t?.dependsOnId,
          "Nessuna dipendenza",
        )}
        <p className="mt-1 text-[12px] text-ink-faint">Non si potrà avviare finché quella non è fatta.</p>
      </div>
      <div className="sm:col-span-2">
        <Campo id="notes" label="Note" optional>
          <textarea id="notes" name="notes" rows={3} maxLength={2000} className="input" defaultValue={t?.notes} />
        </Campo>
      </div>
    </div>
  );
}
