import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getVetrinaSettings } from "@/features/vetrina/service";
import { Campo, ActionForm } from "@/components/ui/action-form";
import { FotoUploader } from "@/components/vetrina/foto-uploader";
import { PageHeader } from "@/components/layout/page-header";
import { salvaSitoAction } from "../actions";
import { HERO_DEFAULT } from "@/lib/vetrina/contenuti";

export const metadata = { title: "Banner e contatti" };
export const dynamic = "force-dynamic";

export default async function SitoPage() {
  await requireUser("contenuti:scrivi");
  const s = await getVetrinaSettings();
  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <PageHeader title="Banner e contatti" subtitle="La foto grande in cima al sito, la frase principale e i recapiti mostrati ai clienti" />
      <div className="mx-auto max-w-3xl">
        <ActionForm action={salvaSitoAction} submit="Salva" icon={<Save size={16} />}>
          <div className="space-y-4">
            <div>
              <span className="label">Foto del banner</span>
              <p className="mb-2 text-[12px] text-ink-faint">Meglio una foto orizzontale, luminosa, almeno 1600 pixel di larghezza. Se non ne metti una, il sito usa uno sfondo blu con il mare.</p>
              <FotoUploader name="bannerId" iniziali={s.bannerId ? [s.bannerId] : []} singola max={1} />
            </div>
            <div className="space-y-3 rounded-xl border border-line p-3">
              <p className="text-[13px] font-semibold">Frase principale del banner</p>
              <p className="text-[12px] text-ink-faint">Il titolo comincia sempre con &quot;Faieta Marine.&quot;; qui scegli la frase che segue e il testo sotto. Lascia vuoto per il testo predefinito.</p>
              <Campo id="heroFrase" label="Frase dopo «Faieta Marine.»" optional>
                <input id="heroFrase" name="heroFrase" className="input" maxLength={140} placeholder={HERO_DEFAULT.frase} defaultValue={s.heroFrase} />
              </Campo>
              <Campo id="heroSotto" label="Testo sotto il titolo" optional>
                <textarea id="heroSotto" name="heroSotto" className="input" rows={2} maxLength={280} placeholder={HERO_DEFAULT.sotto} defaultValue={s.heroSotto} />
              </Campo>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo id="telefono" label="Telefono">
                <input id="telefono" name="telefono" className="input" required defaultValue={s.telefono} />
              </Campo>
              <Campo id="whatsapp" label="WhatsApp" optional help="Con prefisso, es. 393331234567">
                <input id="whatsapp" name="whatsapp" className="input" defaultValue={s.whatsapp} />
              </Campo>
              <Campo id="email" label="Email">
                <input id="email" name="email" type="email" className="input" required defaultValue={s.email} />
              </Campo>
              <Campo id="indirizzo" label="Indirizzo">
                <input id="indirizzo" name="indirizzo" className="input" required defaultValue={s.indirizzo} />
              </Campo>
            </div>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
