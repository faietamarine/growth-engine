import { CheckCircle2 } from "lucide-react";

/** Messaggio di esito dopo un'azione (passato nell'indirizzo come ?msg=). */
export function Flash({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p role="status" className="mb-4 flex items-center gap-2 rounded-md bg-ok/10 px-4 py-2.5 text-sm font-medium text-ok">
      <CheckCircle2 size={16} /> {msg.slice(0, 200)}
    </p>
  );
}
