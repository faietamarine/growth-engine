/* Generatore dei lead magnet (funzioni pure, testate in tests/lead-magnets.test.ts). */
import { z } from "zod";
import { extractSubject } from "@/lib/campaigns/generate";
import { CHECKLIST_COMUNE, getLmTipo, type LmTipo } from "./catalog";
import { LIMITI, type LeadMagnetContent, type LmMetaAd } from "@/types/lead-magnet";

export type LmInput = {
  tipo: string;
  tema?: string; // testo libero: "gommoni Joker Boat", "tagliando motori Yamaha"...
  soggettoCampagna?: string; // soggetto del piano della campagna collegata
};

const cap = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);
// Iniziali maiuscole per gli annunci Google, tranne articoli e preposizioni brevi ("Barche a Vela Usate").
const MINUSCOLE = new Set(["a", "e", "di", "da", "in", "con", "per", "su", "tra", "fra", "il", "lo", "la", "i", "gli", "le", "del", "della", "dei", "delle", "al", "alla"]);
const titleCase = (t: string) =>
  t
    .split(" ")
    .map((w, i) => (i > 0 && MINUSCOLE.has(w.toLowerCase()) ? w.toLowerCase() : w.replace(/^(\p{L})/u, (c) => c.toUpperCase())))
    .join(" ");

function filler(soggetto: string) {
  return (t: string) => cap(t.replaceAll("{S}", cap(soggetto)).replaceAll("{s}", soggetto));
}

/** Tiene solo i testi entro il limite, senza doppioni (ignorando maiuscole). */
export function entroLimite(lista: string[], max: number, quanti: number) {
  const visti = new Set<string>();
  return lista.filter((x) => {
    const k = x.toLowerCase().trim();
    if (!k || x.length > max || visti.has(k)) return false;
    visti.add(k);
    return true;
  }).slice(0, quanti);
}

export function generateLeadMagnet(input: LmInput, now = new Date()): { title: string; content: LeadMagnetContent } {
  const t = getLmTipo(input.tipo);
  if (!t) throw new Error("Tipo di lead magnet non valido.");
  // Soggetto: riconosciuto dal tema, oppure il tema stesso se è breve, poi quello della campagna, infine il predefinito.
  const tema = input.tema?.trim() ?? "";
  const soggetto = (tema && extractSubject(tema)) || (tema && tema.length <= 40 ? tema : "") || input.soggettoCampagna || t.soggettoDefault;
  const f = filler(soggetto.slice(0, 80));
  // Per gli annunci Google il soggetto va con le iniziali maiuscole ("Gommoni Joker Boat").
  const fg = (x: string) => x.replaceAll("{S}", titleCase(soggetto)).replaceAll("{s}", soggetto);

  const meta: LmMetaAd[] = t.meta.map((m) => {
    const titolo = f(m.titolo);
    const descrizione = f(m.descrizione);
    return {
      testoPrincipale: f(m.testoPrincipale),
      titolo: titolo.length <= LIMITI.metaTitolo ? titolo : t.cta.slice(0, LIMITI.metaTitolo),
      descrizione: descrizione.length <= LIMITI.metaDescrizione ? descrizione : "Scopri di più",
    };
  });

  const content: LeadMagnetContent = {
    tipo: t.key,
    soggetto,
    generatoDa: "mock",
    generatoIl: now.toISOString(),
    titolo: f(t.titolo),
    sottotitolo: f(t.sottotitolo),
    promessa: f(t.promessa),
    benefici: t.benefici.map(f),
    obiezioni: t.obiezioni,
    struttura: t.struttura,
    landing: { headline: f(t.headline), sottotitolo: f(t.sottotitolo), bullet: t.bullet.map(f), faq: t.faq, cta: t.cta, provaSociale: t.provaSociale },
    metaAds: meta,
    googleAds: {
      titoli: entroLimite(t.googleTitoli.map(fg), LIMITI.googleTitolo, 15),
      descrizioni: entroLimite(t.googleDescrizioni.map(fg), LIMITI.googleDescrizione, 4),
    },
    email: { oggetto: f(t.email.oggetto).slice(0, LIMITI.emailOggetto), anteprima: f(t.email.anteprima).slice(0, LIMITI.emailAnteprima), testo: t.email.testo.replaceAll("{s}", soggetto) },
    whatsapp: t.whatsapp.map((w) => w.replaceAll("{s}", soggetto)),
    promptImmagini: t.promptImmagini.map((p) => p.replaceAll("{s}", soggetto)),
    promptVideo: t.promptVideo.map((p) => p.replaceAll("{s}", soggetto)),
    checklist: [...t.checklist, ...CHECKLIST_COMUNE].map((voce) => ({ voce, fatto: false })),
  };
  return { title: content.titolo.slice(0, 160), content };
}

export type Avviso = { campo: string; testo: string; lunghezza: number; limite: number };

/** Testi oltre i limiti delle piattaforme (mostrati nella scheda e nell'editor). */
export function controllaLimiti(c: LeadMagnetContent): Avviso[] {
  const out: Avviso[] = [];
  const chk = (campo: string, testo: string, limite: number) => {
    if (testo.length > limite) out.push({ campo, testo, lunghezza: testo.length, limite });
  };
  c.googleAds.titoli.forEach((x, i) => chk(`Google, titolo ${i + 1}`, x, LIMITI.googleTitolo));
  c.googleAds.descrizioni.forEach((x, i) => chk(`Google, descrizione ${i + 1}`, x, LIMITI.googleDescrizione));
  c.metaAds.forEach((m, i) => {
    chk(`Meta ${i + 1}, testo principale`, m.testoPrincipale, LIMITI.metaTesto);
    chk(`Meta ${i + 1}, titolo`, m.titolo, LIMITI.metaTitolo);
    chk(`Meta ${i + 1}, descrizione`, m.descrizione, LIMITI.metaDescrizione);
  });
  chk("Email, oggetto", c.email.oggetto, LIMITI.emailOggetto);
  chk("Email, anteprima", c.email.anteprima, LIMITI.emailAnteprima);
  c.whatsapp.forEach((w, i) => chk(`WhatsApp ${i + 1}`, w, LIMITI.whatsapp));
  return out;
}

// ---------------------------------------------------------------------------
// Validazione del contenuto (salvataggio e modifica)
const t = (max: number) => z.string().trim().max(max);
export const lmContentSchema = z.object({
  tipo: t(30),
  soggetto: t(120),
  generatoDa: z.enum(["mock", "anthropic"]),
  generatoIl: t(40),
  titolo: t(160).min(3, "Il titolo è troppo corto"),
  sottotitolo: t(300),
  promessa: t(400),
  benefici: z.array(t(200).min(1)).max(10),
  obiezioni: z.array(z.object({ obiezione: t(200).min(1), risposta: t(400) })).max(10),
  struttura: z.array(z.object({ titolo: t(160).min(1), punti: z.array(t(300).min(1)).max(20) })).max(20),
  landing: z.object({
    headline: t(160).min(3, "Scrivi la headline della landing"),
    sottotitolo: t(300),
    bullet: z.array(t(200).min(1)).max(8),
    faq: z.array(z.object({ domanda: t(200).min(1), risposta: t(600) })).max(12),
    cta: t(60).min(2, "Scrivi l'invito all'azione"),
    provaSociale: t(300),
  }),
  metaAds: z.array(z.object({ testoPrincipale: t(600), titolo: t(80), descrizione: t(60) })).max(5),
  googleAds: z.object({ titoli: z.array(t(60).min(1)).max(15), descrizioni: z.array(t(150).min(1)).max(4) }),
  email: z.object({ oggetto: t(120), anteprima: t(150), testo: t(3000) }),
  whatsapp: z.array(t(1000).min(1)).max(6),
  promptImmagini: z.array(t(600).min(1)).max(8),
  promptVideo: z.array(t(600).min(1)).max(8),
  checklist: z.array(z.object({ voce: t(200).min(1), fatto: z.boolean() })).max(30),
});

export function tipoDi(c: { tipo: string }): LmTipo | null {
  return getLmTipo(c.tipo);
}
