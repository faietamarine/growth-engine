"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/** Pulsante di invio con stato di caricamento e conferma facoltativa. */
export function SubmitButton({ children, className = "btn-primary", confirm, title }: { children: React.ReactNode; className?: string; confirm?: string; title?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      title={title}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}
