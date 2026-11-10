import { LogOut } from "lucide-react";
import { Brand } from "./brand";
import { ROLE_LABEL } from "@/lib/rbac";
import { logout } from "@/app/(auth)/login/actions";
import type { User } from "@/db/schema";

export function Topbar({ user }: { user: User }) {
  const iniziali = user.name
    .replace(/\(.*\)/, "")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur lg:bg-surface">
      <div className="flex items-center justify-between gap-3 bg-[#0C1A30] px-4 py-2.5 lg:hidden">
        <Brand compact />
        <UserChip iniziali={iniziali} />
      </div>
      <div className="hidden items-center justify-end gap-3 px-6 py-2.5 lg:flex">
        <span className="text-[13px] text-ink-soft">
          {user.name} · <span className="font-semibold text-ink">{ROLE_LABEL[user.role]}</span>
        </span>
        <UserChip iniziali={iniziali} dark />
      </div>
    </header>
  );
}

function UserChip({ iniziali, dark = false }: { iniziali: string; dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={dark ? "flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[12px] font-bold text-white" : "flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 text-[12px] font-bold text-white"}>
        {iniziali}
      </span>
      <form action={logout}>
        <button type="submit" className={dark ? "btn-ghost btn-sm" : "flex h-8 w-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10"} aria-label="Esci" title="Esci">
          <LogOut size={15} />
          {dark && "Esci"}
        </button>
      </form>
    </div>
  );
}
