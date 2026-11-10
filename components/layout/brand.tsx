import Image from "next/image";

/** Marchio: logo Faieta Marine + parola "GROWTH" con pillola oro, come "NAUTILUS EVO" nel CRM. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image src="/brand/faieta-marine.png" alt="Faieta Marine" width={48} height={24} priority className="h-auto w-12 shrink-0" />
      <div className="leading-none">
        <div className="flex items-center gap-1.5">
          <span className="font-display text-[15px] font-semibold tracking-wide text-white">GROWTH</span>
          <span className="rounded-full bg-[#B8892F] px-1.5 py-px text-[9.5px] font-extrabold tracking-[.08em] text-[#0C1A30]">ENGINE</span>
        </div>
        {!compact && <div className="mt-1 text-[10.5px] text-white/60">Acquisizione lead</div>}
      </div>
    </div>
  );
}
