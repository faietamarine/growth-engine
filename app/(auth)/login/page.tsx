import Image from "next/image";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Accedi" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ da?: string }> }) {
  if (await currentUser()) redirect("/dashboard");
  const { da } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0C1A30] px-4 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Image src="/brand/faieta-marine.png" alt="Faieta Marine" width={120} height={60} priority className="h-auto" />
          <div className="flex items-center gap-2">
            <span className="font-display text-[26px] font-semibold tracking-wide text-white">GROWTH</span>
            <span className="rounded-full bg-[#B8892F] px-3 py-[3px] text-[12px] font-extrabold tracking-[.09em] text-[#0C1A30]">ENGINE</span>
          </div>
          <p className="text-sm text-white/60">Campagne, funnel e lead per CRM Nautilus EVO</p>
        </div>
        <div className="card p-6">
          <LoginForm da={da} />
        </div>
      </div>
    </main>
  );
}
