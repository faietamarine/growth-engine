import { requireUser } from "@/lib/auth/session";
import { getSiteSettings } from "@/features/settings/service";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "./form";

export const metadata = { title: "Impostazioni" };
export const dynamic = "force-dynamic";

export default async function ImpostazioniPage() {
  await requireUser("impostazioni:gestisci");
  const s = await getSiteSettings();
  return (
    <>
      <PageHeader title="Impostazioni" subtitle="Dati dell'azienda, informativa privacy e strumenti di misurazione delle landing" />
      <SettingsForm s={s} />
    </>
  );
}
