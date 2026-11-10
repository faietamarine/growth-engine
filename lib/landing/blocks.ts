/* Blocchi delle landing: valori iniziali, costruzione da funnel e lead magnet, validazione. */
import { z } from "zod";
import type { FormField, FunnelStep } from "@/db/schema";
import type { Blocco, TipoBlocco } from "@/types/landing";
import type { LeadMagnetContent } from "@/types/lead-magnet";
import { CAMPI_OBBLIGATORI } from "@/lib/funnels/templates";
import { TIPI_CAMPO } from "@/lib/funnels/validation";

export const TIPI_BLOCCO: { tipo: TipoBlocco; nome: string; descrizione: string }[] = [
  { tipo: "hero", nome: "Apertura", descrizione: "Titolo grande, sottotitolo, immagine e pulsante" },
  { tipo: "punti", nome: "Punti elenco", descrizione: "Benefici in breve" },
  { tipo: "testo", nome: "Testo", descrizione: "Un paragrafo con titolo" },
  { tipo: "immagine", nome: "Immagine", descrizione: "Foto a tutta larghezza" },
  { tipo: "video", nome: "Video", descrizione: "YouTube o Vimeo" },
  { tipo: "form", nome: "Form", descrizione: "Raccolta del contatto (obbligatorio)" },
  { tipo: "testimonianze", nome: "Testimonianze", descrizione: "Parole di clienti veri" },
  { tipo: "faq", nome: "Domande frequenti", descrizione: "Risposte ai dubbi" },
  { tipo: "cta", nome: "Invito finale", descrizione: "Richiamo al form in fondo" },
];

export const nuovoId = () => Math.random().toString(36).slice(2, 10);

export const CAMPI_BASE: FormField[] = [
  { nome: "nome", etichetta: "Nome e cognome", tipo: "testo", obbligatorio: true },
  { nome: "telefono", etichetta: "Telefono (anche WhatsApp)", tipo: "telefono", obbligatorio: true },
  { nome: "email", etichetta: "Email", tipo: "email", obbligatorio: false },
  { nome: "messaggio", etichetta: "Come possiamo aiutarti?", tipo: "area", obbligatorio: false },
];

export function bloccoVuoto(tipo: TipoBlocco): Blocco {
  const id = nuovoId();
  switch (tipo) {
    case "hero":
      return { id, tipo, headline: "Titolo della pagina", sottotitolo: "", immagine: "", cta: "Richiedi informazioni" };
    case "punti":
      return { id, tipo, titolo: "Perché sceglierci", voci: ["Primo vantaggio", "Secondo vantaggio", "Terzo vantaggio"] };
    case "testo":
      return { id, tipo, titolo: "", testo: "Scrivi qui il testo." };
    case "immagine":
      return { id, tipo, url: "", didascalia: "" };
    case "video":
      return { id, tipo, url: "", titolo: "" };
    case "form":
      return { id, tipo, titolo: "Lascia i tuoi dati", sottotitolo: "Ti ricontattiamo entro un giorno lavorativo.", campi: CAMPI_BASE, cta: "Invia la richiesta", grazie: "Grazie! Ti contatteremo al più presto." };
    case "testimonianze":
      return { id, tipo, titolo: "Dicono di noi", voci: [] };
    case "faq":
      return { id, tipo, titolo: "Domande frequenti", voci: [] };
    case "cta":
      return { id, tipo, titolo: "Pronto a partire?", testo: "", cta: "Compila il form" };
  }
}

type Sorgenti = {
  titolo: string;
  funnel?: { promise: string; cta: string; formFields: FormField[]; steps: FunnelStep[]; leadMagnet: string } | null;
  leadMagnet?: LeadMagnetContent | null;
  campagna?: { promessa: string; cta: string; offerta: string; hook: string[] } | null;
};

/**
 * Prima bozza della landing a partire da quello che c'è: testi del lead magnet, form del funnel,
 * promessa della campagna. Non inventa testimonianze: quel blocco si aggiunge solo con parole vere.
 */
export function bloccoIniziali({ titolo, funnel, leadMagnet: lm, campagna }: Sorgenti): Blocco[] {
  const cta = lm?.landing.cta || funnel?.cta || campagna?.cta || "Richiedi informazioni";
  const out: Blocco[] = [
    {
      id: nuovoId(),
      tipo: "hero",
      headline: lm?.landing.headline || funnel?.promise || campagna?.promessa || titolo,
      sottotitolo: lm?.landing.sottotitolo || (campagna?.offerta ?? funnel?.leadMagnet ?? ""),
      immagine: "",
      cta,
    },
  ];
  const punti = lm?.landing.bullet.length ? lm.landing.bullet : (campagna?.hook ?? []);
  if (punti.length) out.push({ id: nuovoId(), tipo: "punti", titolo: "In breve", voci: punti });
  if (lm?.promessa) out.push({ id: nuovoId(), tipo: "testo", titolo: lm.titolo, testo: lm.promessa });
  out.push({
    id: nuovoId(),
    tipo: "form",
    titolo: cta,
    sottotitolo: "Ti ricontattiamo entro un giorno lavorativo.",
    campi: funnel?.formFields.length ? funnel.formFields : CAMPI_BASE,
    cta,
    // Le descrizioni dei passi del funnel sono note interne: il messaggio al cliente resta generico e chiaro.
    grazie: "Grazie! Abbiamo ricevuto la tua richiesta: ti contattiamo entro un giorno lavorativo.",
  });
  if (lm?.landing.faq.length) out.push({ id: nuovoId(), tipo: "faq", titolo: "Domande frequenti", voci: lm.landing.faq.map((f) => ({ domanda: f.domanda, risposta: f.risposta })) });
  if (lm?.landing.provaSociale) out.push({ id: nuovoId(), tipo: "cta", titolo: "Pronto a partire?", testo: lm.landing.provaSociale, cta });
  return out;
}

// ---------------------------------------------------------------------------
const t = (max: number) => z.string().trim().max(max);
/** Solo indirizzi https (o vuoti): niente javascript:, data: o http in chiaro. */
const urlSicuro = z
  .string()
  .trim()
  .max(500)
  .refine((u) => u === "" || /^https:\/\/[^\s"'<>]+$/i.test(u), "Usa un indirizzo che inizia con https://");

const campo = z.object({
  nome: z.string().regex(/^[a-zA-Z][a-zA-Z0-9]{1,39}$/),
  etichetta: t(120).min(1),
  tipo: z.enum(TIPI_CAMPO),
  obbligatorio: z.boolean(),
  opzioni: z.array(t(80).min(1)).max(12).optional(),
});

export const bloccoSchema = z.discriminatedUnion("tipo", [
  z.object({ id: t(20), tipo: z.literal("hero"), headline: t(160).min(3, "L'apertura ha bisogno di un titolo"), sottotitolo: t(300), immagine: urlSicuro, cta: t(60).min(2) }),
  z.object({ id: t(20), tipo: z.literal("punti"), titolo: t(120), voci: z.array(t(200).min(1)).min(1).max(10) }),
  z.object({ id: t(20), tipo: z.literal("testo"), titolo: t(160), testo: t(3000).min(1, "Un blocco di testo è vuoto") }),
  z.object({ id: t(20), tipo: z.literal("immagine"), url: urlSicuro.refine((u) => u !== "", "Inserisci l'indirizzo dell'immagine"), didascalia: t(200) }),
  z.object({ id: t(20), tipo: z.literal("video"), url: urlSicuro.refine((u) => u !== "", "Inserisci l'indirizzo del video"), titolo: t(160) }),
  z.object({ id: t(20), tipo: z.literal("form"), titolo: t(160), sottotitolo: t(300), campi: z.array(campo).min(2).max(15), cta: t(60).min(2), grazie: t(400).min(2) }),
  z.object({ id: t(20), tipo: z.literal("testimonianze"), titolo: t(120), voci: z.array(z.object({ testo: t(500).min(1), autore: t(80).min(1) })).max(10) }),
  z.object({ id: t(20), tipo: z.literal("faq"), titolo: t(120), voci: z.array(z.object({ domanda: t(200).min(1), risposta: t(800).min(1) })).max(15) }),
  z.object({ id: t(20), tipo: z.literal("cta"), titolo: t(160).min(1), testo: t(400), cta: t(60).min(2) }),
]);

export const blocchiSchema = z.array(bloccoSchema).max(25);

/** Regole per poter salvare e pubblicare. Restituisce l'elenco dei problemi (vuoto = ok). */
export function problemiPubblicazione(blocchi: Blocco[]): string[] {
  const p: string[] = [];
  const parsed = blocchiSchema.safeParse(blocchi);
  if (!parsed.success) p.push(...new Set(parsed.error.issues.map((i) => i.message)));
  const forms = blocchi.filter((b) => b.tipo === "form");
  if (forms.length === 0) p.push("Serve un blocco Form: senza, la pagina non raccoglie lead.");
  if (forms.length > 1) p.push("Usa un solo blocco Form per pagina.");
  for (const f of forms) {
    for (const n of CAMPI_OBBLIGATORI) {
      const c = f.campi.find((x) => x.nome === n);
      if (!c || !c.obbligatorio) p.push(`Il form deve chiedere «${n}» come campo obbligatorio.`);
    }
  }
  if (blocchi[0]?.tipo !== "hero") p.push("La pagina deve iniziare con il blocco Apertura.");
  return [...new Set(p)];
}

/** Indirizzo di incorporamento per YouTube (senza cookie) e Vimeo; null se non riconosciuto. */
export function embedVideo(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let yt: string | null = null;
    if (host === "youtu.be") yt = u.pathname.slice(1);
    else if (host === "youtube.com" || host === "youtube-nocookie.com") yt = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1] ?? null;
    if (yt && /^[\w-]{6,20}$/.test(yt)) return `https://www.youtube-nocookie.com/embed/${yt}`;
    if (host === "vimeo.com") {
      const v = u.pathname.match(/^\/(\d{5,12})/)?.[1];
      if (v) return `https://player.vimeo.com/video/${v}?dnt=1`;
    }
    return null;
  } catch {
    return null;
  }
}
