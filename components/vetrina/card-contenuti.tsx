import Link from "next/link";
import { CalendarDays, MapPin, Newspaper } from "lucide-react";
import type { Evento, Post } from "@/db/schema";
import { dataLunga, estratto, giornoMese, minutiLettura, periodo, TIPI_EVENTO } from "@/lib/vetrina/contenuti";

export function CardPost({ p }: { p: Post }) {
  return (
    <Link href={`/vetrina/blog/${p.slug}`} className="vt-card">
      <div className="vt-card-foto">
        {p.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${p.foto}`} alt="" loading="lazy" />
        ) : (
          <div className="vt-nofoto">
            <Newspaper size={48} aria-hidden />
          </div>
        )}
      </div>
      <div className="vt-card-corpo">
        <span className="vt-card-marca">
          {p.pubblicatoIl ? dataLunga(p.pubblicatoIl) : ""} · {minutiLettura(p.testo)} min di lettura
        </span>
        <h3>{p.titolo}</h3>
        <p className="vt-card-testo">{p.sommario || estratto(p.testo, 150)}</p>
        <span className="vt-tutti" style={{ marginTop: "auto" }}>
          Leggi →
        </span>
      </div>
    </Link>
  );
}

export function CardEvento({ e, liberi }: { e: Evento; liberi?: number | null }) {
  const { giorno, mese } = giornoMese(e.data);
  return (
    <Link href={`/vetrina/eventi/${e.slug}`} className="vt-card vt-card-evento">
      <div className="vt-card-foto">
        {e.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${e.foto}`} alt="" loading="lazy" />
        ) : (
          <div className="vt-nofoto">
            <CalendarDays size={48} aria-hidden />
          </div>
        )}
        <span className="vt-data-tag" aria-hidden>
          <b>{giorno}</b>
          {mese}
        </span>
        {liberi === 0 && <span className="vt-tag">Posti esauriti</span>}
        {liberi != null && liberi > 0 && liberi <= 5 && <span className="vt-tag">Ultimi {liberi} posti</span>}
      </div>
      <div className="vt-card-corpo">
        <span className="vt-card-marca">{TIPI_EVENTO.find((t) => t.id === e.tipo)?.nome}</span>
        <h3>{e.titolo}</h3>
        <div className="vt-dati">
          <span>
            <CalendarDays size={15} aria-hidden /> {periodo(e.data, e.dataFine)}
            {e.orario ? ` · ${e.orario}` : ""}
          </span>
          {e.luogo && (
            <span>
              <MapPin size={15} aria-hidden /> {e.luogo}
            </span>
          )}
        </div>
        <span className="vt-btn vt-btn-giallo" style={{ marginTop: "auto", alignSelf: "flex-start" }}>
          {liberi === 0 ? "Lista d'attesa" : "Iscriviti"}
        </span>
      </div>
    </Link>
  );
}
