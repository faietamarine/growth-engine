import type { SiteSettings } from "@/types/landing";

/**
 * Valori iniziali delle impostazioni. L'informativa è una BOZZA da far verificare
 * al consulente privacy prima della pubblicazione delle landing.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  ragioneSociale: "Faieta Motors S.r.l.",
  nomeCommerciale: "Faieta Marine",
  indirizzo: "Via Valle Roveto 29, 65124 Pescara (PE)",
  partitaIva: "",
  emailPrivacy: "",
  telefono: "",
  versioneInformativa: "bozza-2026-11",
  informativa: `Titolare del trattamento: {ragioneSociale}, {indirizzo}. Contatto privacy: {emailPrivacy}.

Dati raccolti: i dati che inserisci nel modulo (nome, telefono, email e le risposte alle domande), la data della richiesta e le informazioni sulla provenienza (campagna, sorgente).

Finalità e base giuridica:
1. Rispondere alla tua richiesta (preventivo, prova in mare, valutazione, iscrizione): esecuzione di misure precontrattuali richieste da te. Il conferimento è necessario per risponderti.
2. Inviarti offerte e novità di {nomeCommerciale} via email, telefono o WhatsApp: solo con il tuo consenso facoltativo, revocabile in ogni momento.

Conservazione: per la finalità 1, per il tempo necessario a gestire la richiesta e comunque non oltre 24 mesi dall'ultimo contatto; per la finalità 2, fino alla revoca del consenso.

Destinatari: personale autorizzato di {nomeCommerciale} e fornitori che gestiscono per nostro conto i sistemi informatici (responsabili del trattamento). I dati non sono diffusi.

Diritti: puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opporti al trattamento scrivendo a {emailPrivacy}. Puoi proporre reclamo al Garante per la protezione dei dati personali.

Cookie: le pagine usano cookie tecnici necessari. Strumenti di misurazione e pubblicità (Meta, Google) vengono attivati solo se li accetti nel banner.`,
  metaPixelId: "",
  ga4Id: "",
  gtmId: "",
};

/** Sostituisce i segnaposto dell'informativa con i dati dell'azienda. */
export function informativaCompilata(s: SiteSettings): string {
  return s.informativa
    .replaceAll("{ragioneSociale}", s.ragioneSociale || "[ragione sociale]")
    .replaceAll("{indirizzo}", s.indirizzo || "[indirizzo]")
    .replaceAll("{emailPrivacy}", s.emailPrivacy || "[email privacy da inserire]")
    .replaceAll("{nomeCommerciale}", s.nomeCommerciale || s.ragioneSociale);
}
