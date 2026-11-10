"use client";

import { TriangleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md p-6 text-center">
      <TriangleAlert className="mx-auto mb-2 text-danger" />
      <h1 className="font-display text-lg font-semibold">Qualcosa non è andato</h1>
      <p className="mt-1 text-sm text-ink-soft">{error.message || "Errore imprevisto."}</p>
      <button onClick={reset} className="btn-primary mt-4">
        Riprova
      </button>
    </div>
  );
}
