import type { CategoriaId } from "@/lib/vetrina/catalog";

/* Icone delle categorie: disegno a linea, bianco e giallo, pensato per stare su fondo blu.
   Si usano solo quando per quella categoria non c'è ancora una foto di un mezzo. */
const L = { fill: "none", stroke: "#fff", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const Y = { fill: "none", stroke: "#FFC233", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Onde({ y }: { y: number }) {
  return <path d={`M6 ${y} q7 -6 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0`} {...Y} opacity=".9" />;
}

const DISEGNI: Record<CategoriaId, React.ReactNode> = {
  OPEN: (
    <>
      <path d="M8 38H92Q106 38 114 28L102 52Q99 56 93 56H21Q15 56 12 50Z" {...L} />
      <path d="M58 38L66 22H74L72 38" {...L} />
      <path d="M28 38V30H46V38" {...L} />
      <path d="M80 33H100" {...Y} />
      <Onde y={64} />
    </>
  ),
  CABINATO: (
    <>
      <path d="M8 42H92Q106 42 114 32L102 56Q99 60 93 60H21Q15 60 12 54Z" {...L} />
      <path d="M26 42L33 22H72L88 42" {...L} />
      <path d="M38 27H52L54 37H35M58 27H69L77 37H59" {...L} />
      <path d="M46 15H64" {...Y} />
      <Onde y={67} />
    </>
  ),
  GOMMONE: (
    <>
      <path d="M14 32H96Q113 32 116 42Q113 52 96 52H14Q4 52 4 42Q4 32 14 32Z" {...L} />
      <path d="M18 42H104" {...Y} />
      <path d="M50 32V22H60V32M50 22L57 15H64" {...L} />
      <path d="M68 28H84" {...L} />
      <Onde y={63} />
    </>
  ),
  MOTO_ACQUA: (
    <>
      <path d="M10 46Q18 38 38 36L68 34Q86 30 98 36L110 43Q106 54 90 54H26Q15 54 10 46Z" {...L} />
      <path d="M32 35H62Q67 28 62 26H38Q31 26 32 35Z" {...L} />
      <path d="M72 33L77 21H86L96 33" {...L} />
      <path d="M20 46H92" {...Y} />
      <Onde y={63} />
    </>
  ),
  FUORIBORDO: (
    <>
      <path d="M44 7H76Q86 7 86 18V32H40V18Q40 7 44 7Z" {...L} />
      <path d="M40 19H86" {...Y} />
      <path d="M50 32V50H74V32M44 50H80Q88 50 88 56H42Q38 56 44 50Z" {...L} />
      <path d="M40 14H32V34H40" {...L} />
      <Onde y={66} />
    </>
  ),
};

export function IconaCategoria({ id, title, custom }: { id: CategoriaId; title?: string; custom?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (custom) return <img className="vt-ico" src={`/media/${custom}`} alt={title ?? ""} loading="lazy" />;
  return (
    <svg viewBox="0 0 120 72" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      {DISEGNI[id]}
    </svg>
  );
}
