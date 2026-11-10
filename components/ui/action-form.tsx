"use client";

import { useActionState, useEffect, useRef, startTransition } from "react";
import { Loader2 } from "lucide-react";

export type FormState = { errore?: string; ok?: string } | undefined;

/**
 * Form collegato a una server action: mostra l'errore restituito senza perdere i dati inseriti.
 * In caso di successo l'azione di solito reindirizza; se restituisce { ok } il messaggio compare qui.
 */
export function ActionForm({
  action,
  children,
  submit,
  className = "card space-y-4 p-5",
  icon,
  resetOnOk,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submit: string;
  className?: string;
  icon?: React.ReactNode;
  /** Svuota il form dopo un salvataggio riuscito (es. raccolta contatti uno dopo l'altro). */
  resetOnOk?: boolean;
}) {
  const [state, act, pending] = useActionState<FormState, FormData>(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state?.ok) {
      ref.current?.reset();
      ref.current?.querySelector<HTMLInputElement>("input:not([type=hidden])")?.focus();
    }
  }, [state, resetOnOk]);
  return (
    // Invio gestito a mano: così, se c'è un errore, i dati inseriti restano nel form.
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => act(fd));
      }}
    >
      {children}
      {state?.errore && (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
          {state.errore}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-md bg-ok/10 px-3 py-2 text-[13px] font-medium text-ok">
          {state.ok}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 size={16} className="animate-spin" /> : icon} {submit}
        </button>
      </div>
    </form>
  );
}

/** Campo con etichetta e aiuto, per tenere i form uniformi. */
export function Campo({ id, label, help, optional, children }: { id: string; label: string; help?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="label">
        {label} {optional && <span className="font-normal text-ink-faint">facoltativo</span>}
      </label>
      {children}
      {help && <p className="mt-1 text-[12px] text-ink-faint">{help}</p>}
    </div>
  );
}
