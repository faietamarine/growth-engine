import type { CategoriaId } from "@/lib/vetrina/catalog";

/* Icone delle categorie: barche di profilo disegnate a mano in SVG, con i colori del sito.
   Nessuna immagine esterna: restano nitide a qualsiasi dimensione. */
const B = "#0B5ED7"; // blu
const N = "#062B5F"; // blu scuro
const G = "#FFC233"; // giallo
const V = "#BFE0FF"; // vetro
const W = "#FFFFFF";
const ONDA = "#7FB2F0";

function Onde({ y = 62 }: { y?: number }) {
  return <path d={`M2 ${y} q6 -5 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0`} fill="none" stroke={ONDA} strokeWidth="3" strokeLinecap="round" />;
}

const DISEGNI: Record<CategoriaId, React.ReactNode> = {
  OPEN: (
    <>
      <path d="M8 38H92Q106 38 114 29L102 52Q99 57 93 57H20Q13 57 11 51Z" fill={B} />
      <path d="M12 47H101" stroke={W} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 38H92Q106 38 114 29L112 33Q104 40 92 40H8Z" fill={N} opacity=".35" />
      <rect x="26" y="28" width="28" height="10" rx="4" fill={N} />
      <rect x="30" y="22" width="6" height="8" rx="3" fill={N} />
      <path d="M58 38L67 22H74L72 38Z" fill={V} stroke={N} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="78" y="33" width="24" height="5" rx="2.5" fill={G} />
      <rect x="2" y="33" width="7" height="19" rx="2.5" fill={N} />
      <rect x="0" y="30" width="11" height="6" rx="3" fill={G} />
      <Onde y={63} />
    </>
  ),
  CABINATO: (
    <>
      <path d="M8 40H92Q106 40 114 31L102 53Q99 58 93 58H20Q13 58 11 52Z" fill={B} />
      <path d="M12 49H101" stroke={W} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M26 40L32 22H74L88 40Z" fill={W} stroke={N} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M36 26H52L54 36H33Z" fill={V} />
      <path d="M57 26H70L78 36H59Z" fill={V} />
      <rect x="30" y="18" width="48" height="5" rx="2.5" fill={N} />
      <rect x="44" y="10" width="22" height="6" rx="3" fill={G} />
      <path d="M55 10V4M50 4H60" stroke={N} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="2" y="35" width="7" height="19" rx="2.5" fill={N} />
      <Onde y={64} />
    </>
  ),
  GOMMONE: (
    <>
      <g transform="translate(9 2) scale(.93)">
      <path d="M13 31H96Q113 31 117 41Q113 52 96 52H13Q3 52 3 41.5Q3 31 13 31Z" fill={W} stroke={N} strokeWidth="3" strokeLinejoin="round" />
      <path d="M16 38H100Q108 38 110 41.5Q108 45 100 45H16Z" fill={B} />
      <path d="M50 38V25H60V38" fill={N} />
      <path d="M50 25L58 17H64" fill="none" stroke={N} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 21L58 19V25H52Z" fill={V} />
      <rect x="68" y="29" width="16" height="9" rx="4" fill={G} />
      <path d="M30 35H44" stroke={W} strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
      <rect x="-1" y="31" width="9" height="22" rx="3" fill={N} />
      <rect x="-3" y="26" width="13" height="8" rx="3.5" fill={G} />
      </g>
      <Onde y={63} />
    </>
  ),
  VELA: (
    <>
      <path d="M12 47H104L94 59H24Z" fill={B} />
      <path d="M16 51H100" stroke={W} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M57 6V47" stroke={N} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M53 9V43H24Z" fill={W} stroke={N} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M61 12L98 43H61Z" fill={G} stroke={N} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M57 6L68 9.5L57 13Z" fill={B} />
      <Onde y={65} />
    </>
  ),
  MOTO_ACQUA: (
    <>
      <path d="M10 45Q18 37 38 36L68 34Q86 30 98 36L110 43Q106 54 90 54H26Q15 54 10 45Z" fill={G} stroke={N} strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 35H64Q69 28 63 26H38Q30 26 32 35Z" fill={N} />
      <path d="M72 33L77 21H86" fill="none" stroke={N} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M86 21L96 33" stroke={B} strokeWidth="4" strokeLinecap="round" />
      <path d="M20 46H92" stroke={B} strokeWidth="3" strokeLinecap="round" />
      <path d="M2 50Q6 44 10 48" fill="none" stroke={ONDA} strokeWidth="3" strokeLinecap="round" />
      <Onde y={62} />
    </>
  ),
  FUORIBORDO: (
    <>
      <path d="M44 6H76Q86 6 86 18V32H40V18Q40 6 44 6Z" fill={B} />
      <rect x="40" y="17" width="46" height="6" fill={G} />
      <path d="M48 12H62" stroke={W} strokeWidth="3" strokeLinecap="round" opacity=".7" />
      <path d="M50 32H74V50H50Z" fill={N} />
      <path d="M45 50H80Q88 50 88 55H42Q39 55 45 50Z" fill={N} />
      <path d="M40 14H32V34H40" fill="none" stroke={N} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 58Q48 54 52 58Q48 62 44 58Z" fill={G} />
      <Onde y={67} />
    </>
  ),
};

export function IconaCategoria({ id, title }: { id: CategoriaId; title?: string }) {
  return (
    <svg viewBox="0 0 120 72" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      {DISEGNI[id]}
    </svg>
  );
}
