import clsx from "clsx";
import type { Tone } from "@/lib/labels";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink/[.06] text-ink-soft",
  info: "bg-info/10 text-info",
  warn: "bg-warn/10 text-warn",
  ok: "bg-ok/10 text-ok",
  danger: "bg-danger/10 text-danger",
  gold: "bg-gold/15 text-warn",
  aqua: "bg-aqua/10 text-aqua",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold", TONES[tone], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
