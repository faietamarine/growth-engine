import { MODELLI_CATALOGO } from "@/lib/brands/modelli";
import { getMarchio } from "@/lib/brands/catalog";
import { slug } from "@/lib/vetrina/strumenti";
import type { CategoriaId } from "@/lib/vetrina/catalog";

/** Pagine per le ricerche locali ("gommoni Capelli Pescara"): una per ogni marchio e tipo di mezzo che trattiamo. */
const ETICHETTE: Record<CategoriaId, { plurale: string; singolare: string }> = {
  GOMMONE: { plurale: "Gommoni", singolare: "gommone" },
  OPEN: { plurale: "Barche open", singolare: "barca open" },
  CABINATO: { plurale: "Barche cabinate", singolare: "barca cabinata" },
  MOTO_ACQUA: { plurale: "Moto d'acqua", singolare: "moto d'acqua" },
  FUORIBORDO: { plurale: "Motori fuoribordo", singolare: "motore fuoribordo" },
};

export type PaginaLocale = { slug: string; marca: string; marcaNome: string; categoria: CategoriaId; titolo: string; singolare: string };

export function pagineLocali(): PaginaLocale[] {
  const visti = new Set<string>();
  const out: PaginaLocale[] = [];
  for (const m of MODELLI_CATALOGO) {
    const k = `${m.marca}|${m.categoria}`;
    if (visti.has(k)) continue;
    visti.add(k);
    const marca = getMarchio(m.marca);
    if (!marca) continue;
    const e = ETICHETTE[m.categoria];
    out.push({ slug: `${slug(e.plurale)}-${m.marca}-pescara`, marca: m.marca, marcaNome: marca.nome, categoria: m.categoria, titolo: `${e.plurale} ${marca.nome} a Pescara`, singolare: e.singolare });
  }
  return out;
}
export const paginaLocale = (s: string) => pagineLocali().find((p) => p.slug === s);
