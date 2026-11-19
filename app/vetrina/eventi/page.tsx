import Link from "next/link";
import type { Metadata } from "next";
import { eventiInArrivo, iscrittiPerEvento } from "@/features/vetrina/contenuti";
import { CardEvento } from "@/components/vetrina/card-contenuti";
import { FormAvviso } from "@/components/vetrina/form-avviso";
import { getSiteSettings } from "@/features/settings/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Eventi e prove in mare a Pescara",
  description: "Giornate di prove in mare, open day e presentazioni dei nuovi modelli. Iscriviti e prova la barca, il gommone o la moto d'acqua prima di sceglierla.",
  alternates: { canonical: "/vetrina/eventi" },
};

export default async function Eventi() {
  const [lista, iscritti, s] = await Promise.all([eventiInArrivo(), iscrittiPerEvento(), getSiteSettings()]);
  return (
    <main>
      <section className="vt-titolo-pag">
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › Eventi e prove in mare
          </p>
          <h1>Eventi e prove in mare</h1>
          <p>Provala in acqua prima di sceglierla. Iscriviti alle prossime giornate: i posti sono limitati.</p>
        </div>
      </section>
      <div className="vt-wrap" style={{ paddingTop: 28 }}>
        {lista.length ? (
          <div className="vt-griglia">
            {lista.map((e) => (
              <CardEvento key={e.id} e={e} liberi={e.posti ? Math.max(0, e.posti - (iscritti[e.id] ?? 0)) : null} />
            ))}
          </div>
        ) : (
          <div className="vt-box" style={{ maxWidth: 640, margin: "0 auto" }}>
            <h2 style={{ marginTop: 0 }}>Nessun evento in calendario, per ora</h2>
            <p style={{ color: "var(--muted)" }}>Lasciaci il tuo contatto: ti avvisiamo appena fissiamo la prossima giornata di prove in mare. Oppure prenota una prova su misura.</p>
            <FormAvviso cosa="Prossimi eventi e prove in mare" titolo="Avvisami del prossimo evento" versioneInformativa={s.versioneInformativa} />
          </div>
        )}
      </div>
    </main>
  );
}
