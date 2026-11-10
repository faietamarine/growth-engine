import clsx from "clsx";

/** Barra di avanzamento: verde ≥100%, oro ≥60%, navy sotto (stessa logica "semaforo" del CRM). */
export function Progress({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = pct >= 100 ? "bg-ok" : pct >= 60 ? "bg-gold" : "bg-navy";
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[.07]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
