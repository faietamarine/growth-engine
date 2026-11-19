import Link from "next/link";
import type { Metadata } from "next";
import { getVetrinaSettings, mezzoPubblico } from "@/features/vetrina/service";
import { getMarchio } from "@/lib/brands/catalog";
import { getSiteSettings } from "@/features/settings/service";
import { FormValuta } from "@/components/vetrina/form-valuta";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Valuta la tua barca",
  description: "Vuoi vendere o dare in permuta la tua barca, il tuo gommone o la tua moto d'acqua? Descrivila e ti facciamo una valutazione. Faieta Marine, Pescara.",
  alternates: { canonical: "/vetrina/valuta" },
};

export default async function Valuta({ searchParams }: { searchParams: Promise<{ per?: string }> }) {
  const { per } = await searchParams;
  const [s, v, mezzo] = await Promise.all([getSiteSettings(), getVetrinaSettings(), per && /^[0-9a-f-]{36}$/i.test(per) ? mezzoPubblico(per) : null]);
  const perMezzo = mezzo ? { id: mezzo.id, nome: `${getMarchio(mezzo.marca)?.nome ?? mezzo.marca} ${mezzo.modello}` } : undefined;
  const marche = ["Joker Boat", "Jeanneau", "Capelli", "Yamaha", "Invictus", "Capoforte", "Italmar", "Beneteau", "Sessa", "Zodiac", "Honda", "Suzuki", "Mercury"];
  return (
    <main>
      <section className="vt-titolo-pag">
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › Valuta la tua barca
          </p>
          <h1>Valuta la tua barca</h1>
          <p>Permuta su un nuovo o vendita: descrivi il tuo mezzo, ti richiamiamo con una valutazione senza impegno.</p>
        </div>
      </section>
      <div className="vt-wrap" style={{ paddingTop: 24 }}>
        <div className="vt-box" style={{ maxWidth: 640, margin: "0 auto" }}>
          {perMezzo && (
            <p className="vt-avviso-posti" style={{ marginBottom: 16 }}>
              Permuta per <b>{perMezzo.nome}</b>: descrivi il tuo mezzo, ti diciamo quanto vale sull&apos;acquisto.
            </p>
          )}
          <FormValuta marche={marche} versioneInformativa={s.versioneInformativa} telefono={v.telefono} perMezzo={perMezzo} />
        </div>
      </div>
    </main>
  );
}
