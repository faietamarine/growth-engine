import { LayoutDashboard, Megaphone, Workflow, Magnet, PanelsTopLeft, CalendarDays, Image as ImageIcon, PartyPopper, Send, Settings, BarChart3, Ship } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { can, type Action } from "@/lib/rbac";
import type { Role } from "@/db/schema";

export type NavItem = { href: string; label: string; icon: LucideIcon; blocco?: number; perm?: Action };

/** Voci di menu. "blocco" = blocco della roadmap in cui la sezione diventa operativa. */
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campagne", label: "Campagne", icon: Megaphone },
  { href: "/funnel", label: "Funnel", icon: Workflow },
  { href: "/lead-magnet", label: "Lead magnet", icon: Magnet },
  { href: "/landing", label: "Landing page", icon: PanelsTopLeft },
  { href: "/lead", label: "Lead verso CRM", icon: Send, perm: "lead:vedi" },
  { href: "/eventi", label: "Eventi", icon: PartyPopper },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/asset", label: "Asset", icon: ImageIcon },
  { href: "/mezzi", label: "Vetrina mezzi", icon: Ship },
  { href: "/report", label: "Report", icon: BarChart3, perm: "lead:vedi" },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings, perm: "impostazioni:gestisci" },
];

/** Le 4 voci della barra in basso su telefono (come nel CRM); le altre sono in "Altro". */
export const MOBILE_PRIMARY = ["/dashboard", "/campagne", "/lead", "/calendario"];

/** Voci visibili per un ruolo (le sezioni senza permesso non compaiono nel menu). */
export function navFor(role: Role) {
  return NAV.filter((n) => !n.perm || can(role, n.perm));
}
