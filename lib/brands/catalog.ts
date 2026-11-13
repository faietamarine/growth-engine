/* Marchi che Faieta Marine rappresenta. Il logo sta in public/brand/ ed è senza sfondo.
   Per aggiungere un marchio: un oggetto qui sotto e il suo file di logo. */
export type Marchio = { slug: string; nome: string; logo: string; nota?: string };

export const MARCHI: Marchio[] = [
  { slug: "joker-boat", nome: "Joker Boat", logo: "/brand/joker-boat.png", nota: "Official dealer" },
  { slug: "jeanneau", nome: "Jeanneau", logo: "/brand/jeanneau.png" },
  { slug: "capelli", nome: "Capelli", logo: "/brand/capelli.png" },
  { slug: "yamaha", nome: "Yamaha", logo: "/brand/yamaha.png", nota: "Fuoribordo e WaveRunner" },
  { slug: "invictus", nome: "Invictus", logo: "/brand/invictus.png" },
  { slug: "capoforte", nome: "Capoforte", logo: "/brand/capoforte.png" },
];

export const MARCHIO_SLUGS = MARCHI.map((m) => m.slug);

export const getMarchio = (slug?: string | null) => MARCHI.find((m) => m.slug === slug);
