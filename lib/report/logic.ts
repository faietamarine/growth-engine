import { addDays } from "@/lib/campaigns/generate";
import { CHANNEL_LABEL, euro } from "@/lib/labels";
import type { Channel } from "@/lib/enums";

// ---------------------------------------------------------------------------
// Periodi del report

export const PERIODI = [
  { key: "mese", nome: "Questo mese" },
  { key: "30", nome: "Ultimi 30 giorni" },
  { key: "90", nome: "Ultimi 90 giorni" },
  { key: "anno", nome: "Anno solare" },
  { key: "nautico", nome: "Anno nautico" },
] as const;
export type PeriodoKey = (typeof PERIODI)[number]["key"];

export type Periodo = { key: PeriodoKey; da: string; a: string; etichetta: string };

/**
 * Intervallo di date (estremi inclusi, AAAA-MM-GG) per il periodo scelto.
 * Anno nautico: dal 1° settembre al 31 agosto, come nel CRM (la stagione commerciale nautica).
 * Esempio: il 9 novembre 2026 l'anno nautico è 2026/27 = 01/09/2026 – 31/08/2027.
 */
export function periodo(key: string | undefined, oggi: string): Periodo {
  const y = Number(oggi.slice(0, 4));
  const m = Number(oggi.slice(5, 7));
  switch (key) {
    case "30":
      return { key: "30", da: addDays(oggi, -29), a: oggi, etichetta: "Ultimi 30 giorni" };
    case "90":
      return { key: "90", da: addDays(oggi, -89), a: oggi, etichetta: "Ultimi 90 giorni" };
    case "anno":
      return { key: "anno", da: `${y}-01-01`, a: `${y}-12-31`, etichetta: `Anno solare ${y}` };
    case "nautico": {
      const inizio = m >= 9 ? y : y - 1;
      return { key: "nautico", da: `${inizio}-09-01`, a: `${inizio + 1}-08-31`, etichetta: `Anno nautico ${inizio}/${String(inizio + 1).slice(2)}` };
    }
    default: {
      const giorni = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const mm = String(m).padStart(2, "0");
      return { key: "mese", da: `${y}-${mm}-01`, a: `${y}-${mm}-${giorni}`, etichetta: maiuscola(new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)))) };
    }
  }
}

const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const nelPeriodo = (data: string, p: Pick<Periodo, "da" | "a">) => data >= p.da && data <= p.a;

// ---------------------------------------------------------------------------
// Metriche

export const percento = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
export const costoPer = (spesa: number, n: number) => (n > 0 ? Math.round((spesa / n) * 100) / 100 : null);

// ---------------------------------------------------------------------------
// Suggerimenti di miglioramento (regole leggibili, nessuna "magia")

export type DatiSuggerimenti = {
  landing: { titolo: string; visite: number; lead: number; abAttivo: boolean }[];
  campagne: { nome: string; spesa: number; qualificati: number; cplObiettivo: number | null; attiva: boolean }[];
  canali: { canale: Channel; lead: number; qualificati: number }[];
  leadTotali: number;
  nonQualificati: number;
  inCoda: number;
  attivitaInRitardo: number;
  eventi: { nome: string; iscritti: number; presenti: number; concluso: boolean }[];
};

export type Suggerimento = { livello: "alta" | "media" | "info"; titolo: string; azione: string };

export function suggerimenti(d: DatiSuggerimenti): Suggerimento[] {
  const out: Suggerimento[] = [];

  if (d.inCoda > 0)
    out.push({ livello: "alta", titolo: `${d.inCoda} ${d.inCoda === 1 ? "lead qualificato aspetta" : "lead qualificati aspettano"} di essere consegnati al CRM`, azione: "Apri «Lead verso CRM» e scarica il file per Nautilus EVO: un lead richiamato entro 24 ore converte molto di più." });

  for (const l of d.landing) {
    const conv = percento(l.lead, l.visite);
    if (l.visite >= 300 && conv !== null && conv < 2)
      out.push({
        livello: "media",
        titolo: `«${l.titolo}» converte poco: ${conv.toLocaleString("it-IT")}% su ${l.visite.toLocaleString("it-IT")} visite`,
        azione: l.abAttivo ? "Il test A/B è già attivo: aspetta che arrivi a un risultato prima di cambiare altro." : "Prova un test A/B sul titolo o sul pulsante, e riduci il form ai soli campi indispensabili.",
      });
  }

  for (const c of d.campagne) {
    if (!c.attiva || c.cplObiettivo === null || c.qualificati === 0) continue;
    const cpl = c.spesa / c.qualificati;
    if (cpl > c.cplObiettivo * 1.3)
      out.push({ livello: "media", titolo: `«${c.nome}»: ${euro(cpl)} per lead qualificato, oltre il previsto (${euro(c.cplObiettivo)})`, azione: "Sposta budget sul canale che porta più lead qualificati o rivedi l'offerta dell'annuncio." });
  }
  for (const c of d.campagne) if (c.attiva && c.spesa >= 300 && c.qualificati === 0) out.push({ livello: "alta", titolo: `«${c.nome}» ha speso ${euro(c.spesa)} senza lead qualificati`, azione: "Controlla che il link degli annunci porti alla landing giusta (con gli UTM) e che il form funzioni." });

  const conLead = d.canali.filter((c) => c.lead >= 5);
  if (conLead.length >= 2) {
    const tasso = (c: (typeof conLead)[number]) => c.qualificati / c.lead;
    const migliore = [...conLead].sort((a, b) => tasso(b) - tasso(a))[0];
    const peggiore = [...conLead].sort((a, b) => tasso(a) - tasso(b))[0];
    if (migliore.canale !== peggiore.canale && tasso(migliore) - tasso(peggiore) >= 0.25)
      out.push({
        livello: "info",
        titolo: `${CHANNEL_LABEL[migliore.canale]} porta lead migliori di ${CHANNEL_LABEL[peggiore.canale]}`,
        azione: `Qualificati: ${Math.round(tasso(migliore) * 100)}% contro ${Math.round(tasso(peggiore) * 100)}%. Valuta di spostare parte del budget.`,
      });
  }

  if (d.leadTotali >= 10 && d.nonQualificati / d.leadTotali > 0.5)
    out.push({ livello: "media", titolo: `Più di metà dei lead non è qualificata (${d.nonQualificati} su ${d.leadTotali})`, azione: "Aggiungi al form una domanda su budget o tempistica, o rendi più chiara l'offerta per attirare contatti più pronti." });

  if (d.attivitaInRitardo > 0)
    out.push({ livello: d.attivitaInRitardo >= 3 ? "alta" : "media", titolo: `${d.attivitaInRitardo} ${d.attivitaInRitardo === 1 ? "attività in ritardo" : "attività in ritardo"} nel calendario di produzione`, azione: "Apri il Calendario: riassegna o sposta le scadenze, così le campagne partono in tempo." });

  for (const e of d.eventi) {
    if (!e.concluso || e.iscritti < 10) continue;
    const p = percento(e.presenti, e.iscritti) ?? 0;
    if (p < 50) out.push({ livello: "info", titolo: `«${e.nome}»: si è presentato il ${p.toLocaleString("it-IT")}% degli iscritti`, azione: "Per il prossimo evento aggiungi un promemoria WhatsApp il giorno prima e una conferma 3 giorni prima." });
  }

  if (!out.length) out.push({ livello: "info", titolo: "Nessun problema evidente nel periodo", azione: "Continua così: controlla il report ogni settimana." });
  const peso = { alta: 0, media: 1, info: 2 };
  return out.sort((a, b) => peso[a.livello] - peso[b.livello]);
}

// ---------------------------------------------------------------------------
// Andamento: settimane (lunedì) o mesi

/** Lunedì della settimana di una data (AAAA-MM-GG). */
export function settimanaDi(d: string) {
  const [y, m, g] = d.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, g)).getUTCDay();
  const t = new Date(Date.UTC(y, m - 1, g - ((wd + 6) % 7)));
  return t.toISOString().slice(0, 10);
}
export function chiaviPeriodo(da: string, a: string, perMese: boolean) {
  const out: string[] = [];
  if (perMese) {
    for (let k = da.slice(0, 7); k <= a.slice(0, 7); ) {
      out.push(k);
      const [y, m] = k.split("-").map(Number);
      k = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    }
  } else {
    for (let k = settimanaDi(da); k <= a; ) {
      out.push(k);
      const [y, m, g] = k.split("-").map(Number);
      k = new Date(Date.UTC(y, m - 1, g + 7)).toISOString().slice(0, 10);
    }
  }
  return out;
}
const MESI_BREVI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
export const etichettaMese = (k: string) => `${MESI_BREVI[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`;
export const etichettaSettimana = (k: string) => `${Number(k.slice(8, 10))} ${MESI_BREVI[Number(k.slice(5, 7)) - 1]}`;
