import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-dvh">
      <Sidebar role={user.role} />
      <div className="min-w-0 flex-1">
        <Topbar user={user} />
        <main className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-5 lg:px-6 lg:pb-10">{children}</main>
      </div>
      <MobileNav role={user.role} />
    </div>
  );
}
