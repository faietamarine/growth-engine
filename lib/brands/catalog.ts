/* Marchi che Faieta Marine rappresenta come dealer ufficiale. Il logo sta in public/brand/ ed è senza sfondo.
   Per aggiungere un marchio: un oggetto qui sotto e il suo file di logo (senza logo il sito mostra il nome in stampatello).
   `aree` = macro aree del marchio (es. Capelli: barche e gommoni): la pagina del marchio le mostra come due grandi riquadri. */
export type AreaMarchio = { id: string; nome: string; categorie: string[] };
export type Marchio = { slug: string; nome: string; logo?: string; aree?: AreaMarchio[] };

export const MARCHI: Marchio[] = [
  { slug: "joker-boat", nome: "Joker Boat", logo: "/brand/joker-boat.png" },
  { slug: "jeanneau", nome: "Jeanneau", logo: "/brand/jeanneau.png" },
  {
    slug: "capelli",
    nome: "Capelli",
    logo: "/brand/capelli.png",
    aree: [
      { id: "barche", nome: "Barche", categorie: ["OPEN", "CABINATO"] },
      { id: "gommoni", nome: "Gommoni", categorie: ["GOMMONE"] },
    ],
  },
  {
    slug: "yamaha",
    nome: "Yamaha",
    logo: "/brand/yamaha.png",
    aree: [
      { id: "fuoribordo", nome: "Fuoribordo", categorie: ["FUORIBORDO"] },
      { id: "moto-d-acqua", nome: "Moto d'acqua", categorie: ["MOTO_ACQUA"] },
    ],
  },
  { slug: "invictus", nome: "Invictus", logo: "/brand/invictus.png" },
  { slug: "capoforte", nome: "Capoforte", logo: "/brand/capoforte.png" },
  { slug: "italmar", nome: "Italmar" },
];

export const MARCHIO_SLUGS = MARCHI.map((m) => m.slug);

export const getMarchio = (slug?: string | null) => MARCHI.find((m) => m.slug === slug);
