import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getVetrinaSettings } from "@/features/vetrina/service";
import { CATEGORIE } from "@/lib/vetrina/catalog";
import { ActionForm } from "@/components/ui/action-form";
import { IconeEditor } from "@/components/vetrina/icone-editor";
import { PageHeader } from "@/components/layout/page-header";
import { salvaIconeAction } from "../actions";

export const metadata = { title: "Icone del sito" };
export const dynamic = "force-dynamic";

export default async function IconePage() {
  await requireUser("contenuti:scrivi");
  const s = await getVetrinaSettings();
  return (
    <>
      <Link href="/mezzi" className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-navy">
        <ArrowLeft size={14} /> Vetrina mezzi
      </Link>
      <PageHeader title="Icone del sito" subtitle="Le immagini delle tessere Gommoni, Open, Cabinati, Moto d'acqua e Fuoribordo" />
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="card text-[13px] leading-relaxed text-ink-soft">
          <p className="font-semibold text-ink">Che file caricare</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>Un'immagine che <b>riempie tutta la tessera</b>, come la cornice blu: una foto o una grafica a pieno formato, senza margini attorno.</li>
            <li>Misura consigliata: <b>1200 × 900 pixel</b> (proporzione 4:3, orizzontale). Se la proporzione è diversa viene ritagliata ai bordi, quindi tieni il soggetto al centro.</li>
            <li>Formato: <b>JPG</b> (consigliato per le foto), PNG o WebP. Peso massimo circa 1,5 MB; viene ridotta in automatico.</li>
            <li>Il nome della categoria e il numero di mezzi compaiono in basso sopra l'immagine: lascia il fondo un po' libero o scuro, così il testo si legge.</li>
            <li>La tua immagine ha la precedenza sulla foto del mezzo nella tessera. Con "Ripristina" torna quella di prima.</li>
          </ul>
        </div>
        <ActionForm action={salvaIconeAction} submit="Salva icone" icon={<Save size={16} />}>
          <IconeEditor categorie={CATEGORIE.map((c) => ({ id: c.id, nome: c.nome }))} iniziali={s.icone ?? {}} />
        </ActionForm>
      </div>
    </>
  );
}
