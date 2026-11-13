import Link from "next/link";
import type { Metadata } from "next";
import { mezziPubblici } from "@/features/vetrina/service";
import { getSiteSettings } from "@/features/settings/service";
import { getMarchio } from "@/lib/brands/catalog";
import { euro, metri } from "@/lib/vetrina/catalog";
import { Quiz, type MezzoQuiz } from "@/components/vetrina/quiz";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Trova la tua barca", description: "Tre domande e ti proponiamo i mezzi più adatti a come navighi." };

export default async function QuizPage() {
  const [tutti, s] = await Promise.all([mezziPubblici(), getSiteSettings()]);
  const mezzi: MezzoQuiz[] = tutti
    .filter((m) => m.stato === "PUBBLICATO")
    .map((m) => ({
      id: m.id,
      titolo: `${getMarchio(m.marca)?.nome ?? m.marca} ${m.modello}`,
      categoria: m.categoria,
      condizione: m.condizione,
      inEvidenza: m.inEvidenza,
      foto: m.foto[0] ?? null,
      dettaglio: [m.anno, metri(m.lunghezza), m.prezzo == null ? "Prezzo su richiesta" : euro(m.prezzo)].filter(Boolean).join(" · "),
    }));
  return (
    <main>
      <section className="vt-titolo-pag" style={{ paddingBottom: 40 }}>
        <div className="vt-wrap">
          <p className="vt-briciole">
            <Link href="/vetrina">Home</Link> › Trova la tua barca
          </p>
          <h1>Dicci come navighi: ti proponiamo i mezzi giusti</h1>
          <p>Tre domande, due minuti, nessun obbligo di acquisto.</p>
        </div>
      </section>
      <div className="vt-wrap">
        <Quiz mezzi={mezzi} versioneInformativa={s.versioneInformativa} />
      </div>
    </main>
  );
}
