"use client";

import { useActionState } from "react";
import { Loader2, CheckCircle2, TriangleAlert, Trash2 } from "lucide-react";
import { eliminaDatiDemo, type SettingsState } from "./actions";

const PAROLA = "ELIMINA DATI DEMO";

export function ResetDemoForm() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(eliminaDatiDemo, undefined);
  return (
    <section className="card mt-6 p-5" aria-labelledby="reset-demo">
      <h2 id="reset-demo" className="text-[16px] font-semibold text-danger">Elimina dati demo</h2>
      <p className="mt-1 text-[14px] text-ink-soft">
        Cancella campagne, landing, funnel, lead, eventi, asset e attività di esempio. Resta il tuo account Admin e le impostazioni dell&apos;azienda.
        L&apos;operazione non si annulla.
      </p>
      <form action={action} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="label">Per confermare scrivi {PAROLA}</span>
          <input name="conferma" autoComplete="off" className="input" placeholder={PAROLA} />
        </label>
        <button type="submit" disabled={pending} className="btn bg-danger text-white hover:opacity-90 disabled:opacity-60">
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Elimina dati demo
        </button>
      </form>
      {state && (
        <p role="status" className={`mt-3 flex items-start gap-2 text-[14px] ${state.ok ? "text-ink" : "text-danger"}`}>
          {state.ok ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <TriangleAlert size={17} className="mt-0.5 shrink-0" />}
          {state.msg}
        </p>
      )}
    </section>
  );
}
