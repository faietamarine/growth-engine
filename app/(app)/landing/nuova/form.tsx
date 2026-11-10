"use client";

import { useActionState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { creaLanding, type CreaLandingState } from "../actions";

type Opz = { id: string; name: string };

export function NuovaLandingForm({ funnel, magnet, campagne, preset }: { funnel: Opz[]; magnet: Opz[]; campagne: Opz[]; preset: { funnelId?: string; leadMagnetId?: string; campaignId?: string; title?: string } }) {
  const [state, action, pending] = useActionState<CreaLandingState, FormData>(creaLanding, undefined);
  const sel = (id: string, label: string, aiuto: string, opz: Opz[], def?: string) => (
    <div>
      <label htmlFor={id} className="label">
        {label} <span className="font-normal text-ink-faint">facoltativo</span>
      </label>
      <select id={id} name={id} className="input" defaultValue={def ?? ""}>
        <option value="">Nessuno</option>
        {opz.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[12px] text-ink-faint">{aiuto}</p>
    </div>
  );
  return (
    <form action={action} className="card mx-auto max-w-2xl space-y-4 p-5">
      <div>
        <label htmlFor="title" className="label">
          Titolo della pagina
        </label>
        <input id="title" name="title" className="input" required minLength={3} maxLength={120} defaultValue={preset.title} placeholder="Es. Prova in mare gommoni Joker — maggio" />
        <p className="mt-1 text-[12px] text-ink-faint">Diventa anche l&apos;indirizzo della pagina (modificabile fino alla prima pubblicazione).</p>
      </div>
      {sel("funnelId", "Dal funnel", "Porta il form con i campi del funnel e l'invito all'azione.", funnel, preset.funnelId)}
      {sel("leadMagnetId", "Dal lead magnet", "Porta titolo, punti elenco, FAQ e testi della landing.", magnet, preset.leadMagnetId)}
      {sel("campaignId", "Per la campagna", "Se manca, si prende quella del funnel o del lead magnet.", campagne, preset.campaignId)}
      {state?.errore && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
          {state.errore}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />} Crea e apri l&apos;editor
        </button>
      </div>
    </form>
  );
}
