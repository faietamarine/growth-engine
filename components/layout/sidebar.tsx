"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { navFor } from "./nav";
import type { Role } from "@/db/schema";
import { Brand } from "./brand";

export function Sidebar({ role }: { role: Role }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col bg-[#0C1A30] lg:flex">
      <div className="border-b border-white/10 px-4 py-4">
        <Brand />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Sezioni">
        {navFor(role).map(({ href, label, icon: Icon, blocco }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              {active && <span className="absolute left-0 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-r bg-[#B8892F]" aria-hidden />}
              <Icon size={17} strokeWidth={1.8} />
              <span className="flex-1">{label}</span>
              {blocco && <span className="rounded bg-white/10 px-1.5 text-[10px] font-semibold text-white/55" title={`Disponibile dal blocco ${blocco}`}>B{blocco}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-[11px] text-white/45">Consegna i lead a CRM Nautilus EVO</div>
    </aside>
  );
}
