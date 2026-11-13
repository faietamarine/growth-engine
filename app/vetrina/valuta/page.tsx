import Link from "next/link";
import type { Metadata } from "next";
import { getVetrinaSettings } from "@/features/vetrina/service";
import { getSiteSettings } from "@/features/settings/service";
import { FormValuta } from "@/components/vetrina/form-valuta";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Valuta la tua barca",
  description: "Vuoi vendere o dare in permuta la tua barca, il tuo gommone o la tua moto d'acqua? Descrivila e ti facciamo una valutazione. Faieta Marine, Pescara.",
  alternates: { canonical: "/vetrina/valuta" },
};

export default async function Valuta() {
  const [s, v] = await Promise.all([getSiteSettings(), getVetrinaSettings()]);
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
          <FormValuta marche={marche} versioneInformativa={s.versioneInformativa} telefono={v.telefono} />
        </div>
      </div>
    </main>
  );
}
