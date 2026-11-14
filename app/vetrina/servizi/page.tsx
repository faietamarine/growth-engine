import Link from "next/link";
import type { Metadata } from "next";
import { Anchor, Droplets, Snowflake, Wrench } from "lucide-react";
import { getVetrinaSettings } from "@/features/vetrina/service";
import { getSiteSettings } from "@/features/settings/service";
import { FormPreventivo } from "@/components/vetrina/form-preventivo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Assistenza, rimessaggio e preventivi a Pescara",
  description: "Officina per fuoribordo e moto d'acqua, tagliandi, rimessaggio e invernaggio, preparazione stagionale. Richiedi un preventivo a Faieta Marine, Pescara.",
  alternates: { canonical: "/vetrina/servizi" },
};

const SERVIZI = [
  { icona: Wrench, titolo: "Officina fuoribordo e moto d'acqua", testo: "Tagliandi, diagnosi e riparazioni su fuoribordo e moto d'acqua, con ricambi e personale tecnico in sede." },
  { icona: Droplets, titolo: "Manutenzione e preparazione", testo: "Messa a punto di inizio stagione, controlli prima del varo, lavaggio e sanificazione dei circuiti." },
  { icona: Snowflake, titolo: "Rimessaggio e invernaggio", testo: "Custodia del mezzo nei mesi invernali e preparazione al fermo, per ritrovarlo pronto in primavera." },
  { icona: Anchor, titolo: "Consegna del nuovo", testo: "Allestimento e consegna del mezzo acquistato, con prova e spiegazione a bordo." },
];

export default async function Servizi() {
  const [s, v] = await Promise.all([getSiteSettings(), getVetrinaSettings()]);
  const ld = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Assistenza e rimessaggio nautico",
    provider: { "@type": "AutoDealer", name: "Faieta Marine" },
    areaServed: "Pescara e Abruzzo",
    serviceType: SERVIZI.map((x) => x.titolo),
  };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <section className="vt-titolo-pag">
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › Assistenza
          </p>
          <h1>Assistenza, rimessaggio e preventivi</h1>
          <p>Il tuo mezzo seguito da chi te lo ha venduto, a Pescara.</p>
        </div>
      </section>
      <div className="vt-wrap" style={{ paddingTop: 24 }}>
        <div className="vt-griglia">
          {SERVIZI.map((x) => (
            <div key={x.titolo} className="vt-box">
              <x.icona size={28} color="var(--blu)" aria-hidden />
              <h2 style={{ fontSize: 18, margin: "10px 0 6px" }}>{x.titolo}</h2>
              <p style={{ margin: 0, color: "var(--muted)" }}>{x.testo}</p>
            </div>
          ))}
        </div>
        <div className="vt-box" style={{ maxWidth: 640, margin: "28px auto 0" }}>
          <h2 style={{ marginTop: 0 }}>Richiedi un preventivo</h2>
          <FormPreventivo versioneInformativa={s.versioneInformativa} telefono={v.telefono} />
        </div>
      </div>
    </main>
  );
}
