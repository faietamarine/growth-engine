import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { navFor } from "@/components/layout/nav";
import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Altro" };

export default async function MenuPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Altro" />
      <nav className="card divide-y divide-line" aria-label="Tutte le sezioni">
        {navFor(user.role).map(({ href, label, icon: Icon, blocco }) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium hover:bg-hover">
            <Icon size={19} className="text-navy" strokeWidth={1.8} />
            <span className="flex-1">{label}</span>
            {blocco && <span className="text-[11px] font-semibold text-ink-faint">Blocco {blocco}</span>}
            <ChevronRight size={17} className="text-ink-faint" />
          </Link>
        ))}
      </nav>
    </>
  );
}
