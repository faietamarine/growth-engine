/** Indirizzo pubblico di una landing (APP_URL nel file .env). */
export function urlPubblico(slug: string) {
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/l/${slug}`;
}
