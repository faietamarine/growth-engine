/* Contenuto di un lead magnet (campo lead_magnets.content, JSON). */

export type LmSezione = { titolo: string; punti: string[] };
export type LmFaq = { domanda: string; risposta: string };
export type LmMetaAd = { testoPrincipale: string; titolo: string; descrizione: string };

export type LeadMagnetContent = {
  tipo: string;
  soggetto: string;
  generatoDa: "mock" | "anthropic";
  generatoIl: string;
  titolo: string;
  sottotitolo: string;
  promessa: string;
  benefici: string[];
  obiezioni: { obiezione: string; risposta: string }[];
  /** Struttura del contenuto: capitoli della guida, voci della checklist, domande del quiz, scene del video… */
  struttura: LmSezione[];
  landing: { headline: string; sottotitolo: string; bullet: string[]; faq: LmFaq[]; cta: string; provaSociale: string };
  metaAds: LmMetaAd[];
  googleAds: { titoli: string[]; descrizioni: string[] };
  email: { oggetto: string; anteprima: string; testo: string };
  whatsapp: string[];
  promptImmagini: string[];
  promptVideo: string[];
  checklist: { voce: string; fatto: boolean }[];
};

/** Limiti delle piattaforme (Google: obbligatori; Meta: consigliati per non essere tagliati). */
export const LIMITI = {
  googleTitolo: 30,
  googleDescrizione: 90,
  metaTitolo: 40,
  metaDescrizione: 30,
  metaTesto: 125,
  emailOggetto: 60,
  emailAnteprima: 90,
  whatsapp: 500,
} as const;
