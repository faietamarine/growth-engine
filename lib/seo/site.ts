/** Indirizzo pubblico del sito. Netlify imposta URL (con il dominio vero, quando c'è); APP_URL è il ripiego. */
export function siteUrl(): string {
  const u = process.env.URL || process.env.APP_URL || "http://localhost:3000";
  return u.replace(/\/+$/, "");
}

/** "Via Valle Roveto 29, 65124 Pescara (PE)" → parti dell'indirizzo per i dati strutturati. */
export function parteIndirizzo(ind: string) {
  const m = ind.match(/^(.*?),\s*(\d{5})\s+(.+?)\s*(?:\((\w{2})\))?\s*$/);
  return m
    ? { streetAddress: m[1], postalCode: m[2], addressLocality: m[3], addressRegion: m[4] ?? "", addressCountry: "IT" }
    : { streetAddress: ind, addressCountry: "IT" };
}

/** Testo del messaggio WhatsApp precompilato. */
export const messaggioWhatsApp = (oggetto?: string) => (oggetto ? `Buongiorno, vorrei informazioni su: ${oggetto}` : "Buongiorno, vorrei informazioni sui vostri mezzi.");
