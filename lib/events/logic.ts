import { z } from "zod";
import { addDays } from "@/lib/campaigns/generate";
import { nuovoId } from "@/lib/landing/blocks";
import type { Blocco } from "@/types/landing";
import type { FormField } from "@/db/schema";
import { compila, dataLunga, tipoOrDefault, type Messaggio, type TipoEvento } from "./catalog";

// ---------------------------------------------------------------------------
// Validazione del form evento

const ora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Orario non valido (es. 10:00)");

export const eventoSchema = z
  .object({
    name: z.string().trim().min(3, "Il nome deve avere almeno 3 caratteri").max(120),
    type: z.string().trim().min(2).max(40),
    campaignId: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
    time: ora,
    endTime: ora,
    venue: z.string().trim().min(2, "Indica il luogo").max(160),
    capacity: z.coerce.number().int("Capienza: numero intero").min(0).max(100_000),
    budget: z.coerce.number().min(0).max(10_000_000),
    spent: z.coerce.number().min(0).max(10_000_000).default(0),
    objective: z.string().trim().max(400).default(""),
    notes: z.string().trim().max(2000).default(""),
  })
  .refine((d) => d.endTime > d.time, { path: ["endTime"], message: "L'orario di fine deve essere dopo l'inizio" });

export type EventoInput = z.output<typeof eventoSchema>;

// ---------------------------------------------------------------------------
// Numeri dell'evento

export type NumeriEvento = {
  iscritti: number; // registrati prima dell'evento (dalla pagina di iscrizione)
  presenti: number; // iscritti con check-in
  sulPosto: number; // contatti raccolti durante l'evento senza iscrizione
  qualificati: number; // tra tutti i lead dell'evento: qualificati o già consegnati
  consegnati: number;
  capienza: number;
  spesa: number;
};

export function metricheEvento(n: NumeriEvento) {
  const leadTotali = n.iscritti + n.sulPosto;
  const partecipanti = n.presenti + n.sulPosto;
  const perc = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
  const div = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) / 100 : null);
  return {
    leadTotali,
    partecipanti,
    /** Iscritti che si sono presentati. */
    tassoPresenza: perc(n.presenti, n.iscritti),
    /** Posti occupati sulla capienza (iscritti, perché è il numero che si controlla prima). */
    riempimento: perc(n.iscritti, n.capienza),
    postiLiberi: n.capienza > 0 ? Math.max(0, n.capienza - n.iscritti) : null,
    costoPerLead: div(n.spesa, leadTotali),
    costoPerQualificato: div(n.spesa, n.qualificati),
    costoPerPartecipante: div(n.spesa, partecipanti),
  };
}

// ---------------------------------------------------------------------------
// Programma comunicazioni: date di inviti, promemoria e follow-up

export type Comunicazione = Messaggio & { quando: string; testoCompilato: string; passata: boolean };

/** link: lo stesso per tutti, oppure uno per canale (così gli UTM distinguono email e WhatsApp). */
export function programmaComunicazioni(tipo: TipoEvento, e: { nome: string; date: string; time: string; venue: string }, link: string | ((canale: Messaggio["canale"]) => string) | undefined, oggi: string): Comunicazione[] {
  return tipo.messaggi
    .map((m) => {
      const quando = addDays(e.date, m.giorni);
      const l = typeof link === "function" ? link(m.canale) : link;
      return { ...m, quando, testoCompilato: compila(m.testo, { nome: e.nome, data: e.date, ora: e.time, luogo: e.venue, link: l }), passata: quando < oggi };
    })
    .sort((a, b) => a.quando.localeCompare(b.quando));
}

// ---------------------------------------------------------------------------
// Pagina di registrazione (landing) generata dall'evento

export function campiIscrizione(tipo: TipoEvento): FormField[] {
  const campi: FormField[] = [
    { nome: "nome", etichetta: "Nome e cognome", tipo: "testo", obbligatorio: true },
    { nome: "telefono", etichetta: "Telefono (anche WhatsApp)", tipo: "telefono", obbligatorio: true },
    { nome: "email", etichetta: "Email", tipo: "email", obbligatorio: false },
  ];
  if (tipo.key === "evento-b2b") campi.push({ nome: "azienda", etichetta: "Azienda", tipo: "testo", obbligatorio: true });
  campi.push({ nome: "interesse", etichetta: "Cosa ti interessa?", tipo: "scelta", obbligatorio: false, opzioni: tipo.interessi });
  if (tipo.fasceOrarie) campi.push({ nome: "fascia", etichetta: "Fascia oraria preferita", tipo: "scelta", obbligatorio: true, opzioni: tipo.fasceOrarie });
  return campi;
}

export function blocchiIscrizione(e: { name: string; type: string; date: string; time: string; endTime: string; venue: string; objective: string }): Blocco[] {
  const tipo = tipoOrDefault(e.type);
  const quando = `${dataLunga(e.date)}, ${e.time}–${e.endTime}`;
  const cta = tipo.key === "webinar" ? "Iscriviti al webinar" : "Prenota il tuo posto";
  return [
    { id: nuovoId(), tipo: "hero", headline: e.name, sottotitolo: `${quando[0].toUpperCase()}${quando.slice(1)} · ${e.venue}`, immagine: "", cta },
    { id: nuovoId(), tipo: "punti", titolo: "Cosa trovi", voci: [tipo.descrizione, "Partecipazione gratuita, posti limitati", "Ti confermiamo l'iscrizione via WhatsApp o email"] },
    {
      id: nuovoId(),
      tipo: "form",
      titolo: cta,
      sottotitolo: "Ci vuole un minuto. Ti mandiamo un promemoria il giorno prima.",
      campi: campiIscrizione(tipo),
      cta,
      grazie: `Grazie! Sei iscritto a «${e.name}». Ti ricordiamo l'appuntamento il giorno prima.`,
    },
    {
      id: nuovoId(),
      tipo: "faq",
      titolo: "Domande frequenti",
      voci: [
        { domanda: "Quanto costa partecipare?", risposta: "La partecipazione è gratuita." },
        { domanda: "Posso venire con qualcuno?", risposta: "Certo: indicalo nel messaggio o scrivici dopo l'iscrizione." },
        { domanda: "E se non riesco più a venire?", risposta: "Rispondi al promemoria che ti mandiamo: liberiamo il posto per qualcun altro." },
      ],
    },
  ];
}

/** Il form di iscrizione mette la fascia oraria nelle risposte: la leggiamo per la lista di check-in. */
export const fasciaDi = (answers: Record<string, string>) => answers["fascia"] ?? answers["Fascia oraria preferita"] ?? "";
