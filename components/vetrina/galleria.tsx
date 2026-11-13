"use client";

import { useState } from "react";

export function Galleria({ foto, alt }: { foto: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (!foto.length) return <div className="vt-gal-main" aria-hidden />;
  const vai = (n: number) => setI((n + foto.length) % foto.length);
  return (
    <div>
      <div className="vt-gal-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/media/${foto[i]}`} alt={`${alt} — foto ${i + 1} di ${foto.length}`} fetchPriority="high" />
        {foto.length > 1 && (
          <>
            <button type="button" className="vt-gal-nav vt-gal-prev" onClick={() => vai(i - 1)} aria-label="Foto precedente">
              ‹
            </button>
            <button type="button" className="vt-gal-nav vt-gal-next" onClick={() => vai(i + 1)} aria-label="Foto successiva">
              ›
            </button>
            <span className="vt-gal-conta">
              {i + 1} / {foto.length}
            </span>
          </>
        )}
      </div>
      {foto.length > 1 && (
        <div className="vt-gal-mini">
          {foto.map((f, n) => (
            <button key={f} type="button" aria-current={n === i} aria-label={`Vai alla foto ${n + 1}`} onClick={() => setI(n)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${f}`} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
