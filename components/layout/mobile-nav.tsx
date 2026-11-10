"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Menu } from "lucide-react";
import { navFor, MOBILE_PRIMARY } from "./nav";
import type { Role } from "@/db/schema";

/** Barra in basso su telefono e tablet: 4 sezioni + "Altro", come nel CRM. */
export function MobileNav({ role }: { role: Role }) {
  const path = usePathname();
  const nav = navFor(role);
  // 4 voci in basso: quelle principali consentite al ruolo, completate con le successive.
  const items = [...MOBILE_PRIMARY.map((h) => nav.find((n) => n.href === h)).filter((n) => !!n), ...nav.filter((n) => !MOBILE_PRIMARY.includes(n.href))].slice(0, 4);
  const altroAttivo = !items.some((i) => path.startsWith(i.href));
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Sezioni principali"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = path.startsWith(href);
        return (
          <Link key={href} href={href} className={clsx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", active ? "text-navy" : "text-ink-faint")}>
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            {label.split(" ")[0]}
          </Link>
        );
      })}
      <Link href="/menu" className={clsx("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", altroAttivo ? "text-navy" : "text-ink-faint")}>
        <Menu size={20} strokeWidth={1.8} />
        Altro
      </Link>
    </nav>
  );
}
