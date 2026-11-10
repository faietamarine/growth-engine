/* Blocchi di una landing page. Ogni blocco ha un id stabile (per l'editor) e un tipo. */
import type { FormField } from "@/db/schema";

export type BloccoHero = { id: string; tipo: "hero"; headline: string; sottotitolo: string; immagine: string; cta: string };
export type BloccoPunti = { id: string; tipo: "punti"; titolo: string; voci: string[] };
export type BloccoTesto = { id: string; tipo: "testo"; titolo: string; testo: string };
export type BloccoImmagine = { id: string; tipo: "immagine"; url: string; didascalia: string };
export type BloccoVideo = { id: string; tipo: "video"; url: string; titolo: string };
export type BloccoForm = { id: string; tipo: "form"; titolo: string; sottotitolo: string; campi: FormField[]; cta: string; grazie: string };
export type BloccoTestimonianze = { id: string; tipo: "testimonianze"; titolo: string; voci: { testo: string; autore: string }[] };
export type BloccoFaq = { id: string; tipo: "faq"; titolo: string; voci: { domanda: string; risposta: string }[] };
export type BloccoCta = { id: string; tipo: "cta"; titolo: string; testo: string; cta: string };

export type Blocco = BloccoHero | BloccoPunti | BloccoTesto | BloccoImmagine | BloccoVideo | BloccoForm | BloccoTestimonianze | BloccoFaq | BloccoCta;
export type TipoBlocco = Blocco["tipo"];

/** Test A/B su un elemento della landing: la variante B cambia solo quell'elemento. */
export type AbTest = {
  attivo: boolean;
  elemento: "headline" | "cta" | "immagine" | "offerta";
  valoreB: string;
  iniziatoIl: string;
};

/** Contatori della landing pubblicata, per variante. */
export type LandingStats = { visiteA: number; visiteB: number };

/** Impostazioni globali (tabella settings, chiave "sito"). */
export type SiteSettings = {
  ragioneSociale: string;
  nomeCommerciale: string;
  indirizzo: string;
  partitaIva: string;
  emailPrivacy: string;
  telefono: string;
  informativa: string;
  versioneInformativa: string;
  metaPixelId: string;
  ga4Id: string;
  gtmId: string;
};
