import type { LucideIcon } from "lucide-react";

export function Stat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string | number; hint?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft">
        <Icon size={15} strokeWidth={1.9} className="text-gold" />
        {label}
      </div>
      <div className="num mt-2 font-display text-[26px] font-semibold leading-none text-ink">{value}</div>
      {hint && <div className="mt-2 text-[12.5px] text-ink-soft">{hint}</div>}
    </div>
  );
}
