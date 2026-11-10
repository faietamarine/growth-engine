import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-navy/[.07] text-navy">
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <p className="font-display text-[15px] font-semibold">{title}</p>
      {text && <p className="max-w-sm text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
