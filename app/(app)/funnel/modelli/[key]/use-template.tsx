"use client";

import { useActionState } from "react";
import { Loader2, Copy } from "lucide-react";
import { creaDaModello, type CreateState } from "../../actions";

export function UseTemplate({ templateKey, defaultName, campagne, campagnaPreselezionata }: { templateKey: string; defaultName: string; campagne: { id: string; name: string }[]; campagnaPreselezionata?: string }) {
  const [state, action, pending] = useActionState<CreateState, FormData>(creaDaModello, undefined);
  return (
    <form action={action} className="card space-y-3 p-4" aria-labelledby="t-usa">
      <h2 id="t-usa" className="card-title">
        Usa questo modello
      </h2>
      <input type="hidden" name="key" value={templateKey} />
      <div>
        <label htmlFor="name" className="label">
          Nome del funnel
        </label>
        <input id="name" name="name" className="input" defaultValue={defaultName} required minLength={3} maxLength={120} />
      </div>
      <div>
        <label htmlFor="campaignId" className="label">
          Collega a una campagna <span className="font-normal text-ink-faint">facoltativo</span>
        </label>
        <select id="campaignId" name="campaignId" className="input" defaultValue={campagnaPreselezionata ?? ""}>
          <option value="">Nessuna, per ora</option>
          {campagne.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[12px] text-ink-faint">Collegandolo, il funnel prende promessa, invito all&apos;azione, pubblico e reparto della campagna.</p>
      </div>
      {state?.errore && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
          {state.errore}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />} Crea il mio funnel
      </button>
    </form>
  );
}
