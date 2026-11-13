import type { Marchio } from "@/lib/brands/catalog";

/** Logo del marchio; se il file non c'è ancora, mostra il nome in stampatello. */
export function LogoMarchio({ m, className, style }: { m: Marchio; className?: string; style?: React.CSSProperties }) {
  if (m.logo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.logo} alt={m.nome} className={className} style={style} loading="lazy" decoding="async" />;
  return (
    <span className={className} style={{ fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#062B5F", whiteSpace: "nowrap", fontFamily: "Sora, Inter, sans-serif", ...style }}>
      {m.nome}
    </span>
  );
}
