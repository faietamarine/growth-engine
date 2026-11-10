import { getSiteSettings } from "@/features/settings/service";
import { informativaCompilata } from "@/lib/settings/defaults";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Informativa privacy · Faieta Marine" } };

export default async function PrivacyPage() {
  const s = await getSiteSettings();
  return (
    <main className="min-h-dvh bg-white text-[#1A1F29]">
      <header className="bg-[#0C1A30] py-4">
        <div className="mx-auto max-w-3xl px-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/faieta-marine.png" alt="Faieta Marine" width={84} height={42} className="h-auto" />
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-[28px] font-bold text-[#0F2340]">Informativa sul trattamento dei dati personali</h1>
        <p className="mt-1 text-[13px] text-[#647184]">Versione {s.versioneInformativa}</p>
        <div className="mt-6 whitespace-pre-line text-[15.5px] leading-relaxed">{informativaCompilata(s)}</div>
      </article>
    </main>
  );
}
