/* ============================================================================
   Scenari di campagna per una concessionaria nautica in Abruzzo.
   Ogni scenario è un "modello di pensiero" di marketing: pubblico, promessa,
   obiezioni, funnel, canali e calendario. Nei testi, {s} = il soggetto
   (es. "barche a vela usate", "gommoni Joker Boat").
   Tutto qui è modificabile senza toccare la logica (generate.ts).
   ============================================================================ */
import type { Channel, FormField, FunnelStep, Reparto } from "@/db/schema";
import type { PlanCalendarItem, PlanObjection, PlanSegment } from "@/types/campaign";

/**
 * Costo per lead di riferimento per canale (€). Sono STIME PRUDENZIALI di partenza
 * per il mercato nautico locale, da sostituire con i dati reali dopo le prime campagne.
 * 0 = canale senza spesa diretta (i lead stimati sono calcolati a parte).
 */
export const CPL_RIFERIMENTO: Record<Channel, number> = {
  META: 30,
  GOOGLE: 45,
  EMAIL: 10,
  WHATSAPP: 8,
  EVENTO: 70,
  REFERRAL: 60,
  ORGANICO: 0,
  SITO: 0,
};

/** Lead stimati ogni 30 giorni dai canali senza spesa. */
export const LEAD_ORGANICI_30GG: Partial<Record<Channel, number>> = { ORGANICO: 2, SITO: 2 };

/** Riga di calendario. rif "fine" = giorni rispetto alla FINE campagna (giorno dell'evento o del salone). */
export type CalRow = [giorno: number, attivita: string, tipo: PlanCalendarItem["tipo"], canale?: Channel, rif?: "inizio" | "fine"];

export type Scenario = {
  key: string;
  titolo: string; // usato nel nome campagna
  etichetta: string; // usato nell'interfaccia
  parole: RegExp[];
  reparto: Reparto;
  soggettoDefault: string;
  /** true = il soggetto non si ricava dall'obiettivo (es. referral). */
  soggettoFisso?: boolean;
  /** true = la campagna termina con un evento (salone, open day) nella data di fine. */
  eventoAFine?: boolean;
  budgetBase60gg: number;
  /** Canali a pagamento: [canale, quota %, perché]. Le quote sommano 100. */
  mix: [Channel, number, string][];
  /** Canali senza spesa diretta. */
  organici: [Channel, string][];
  /** Quota stimata di lead che risultano qualificati. */
  tassoQualifica: number;
  /** KPI propri dello scenario, calcolati sui lead qualificati. */
  kpiExtra: { nome: string; quota: number; unita?: string }[];
  audience: PlanSegment[];
  angolo: string;
  promessa: string;
  hook: string[];
  painPoint: string[];
  desideri: string[];
  obiezioni: PlanObjection[];
  offerta: string;
  cta: string;
  funnel: [FunnelStep["tipo"], string, string][];
  form: FormField[];
  calendario: CalRow[];
  asset: string[];
  metriche: string[];
  qualificazione: string[];
};

// ---- Campi del form riusati ----
const F = {
  nome: { nome: "nome", etichetta: "Nome e cognome", tipo: "testo", obbligatorio: true },
  telefono: { nome: "telefono", etichetta: "Telefono (anche WhatsApp)", tipo: "telefono", obbligatorio: true },
  email: { nome: "email", etichetta: "Email", tipo: "email", obbligatorio: false },
  zona: { nome: "zona", etichetta: "Dove navighi o dove tieni la barca", tipo: "testo", obbligatorio: false },
  tempiVendita: { nome: "tempistica", etichetta: "Quando pensi di acquistare?", tipo: "scelta", obbligatorio: true, opzioni: ["Entro 3 mesi", "Entro 6 mesi", "Entro 12 mesi", "Sto solo guardando"] },
  tempiService: { nome: "tempistica", etichetta: "Quando ti serve?", tipo: "scelta", obbligatorio: true, opzioni: ["Urgente", "Entro il mese", "Prossima stagione"] },
  budget: { nome: "budgetFascia", etichetta: "Budget indicativo (€)", tipo: "scelta", obbligatorio: false, opzioni: ["Fino a 20.000", "20.000–50.000", "50.000–100.000", "Oltre 100.000"] },
  messaggio: { nome: "messaggio", etichetta: "Vuoi aggiungere qualcosa?", tipo: "area", obbligatorio: false },
} satisfies Record<string, FormField>;

const METRICHE_BASE = ["Visite alla landing", "Tasso di conversione della landing", "Costo per lead", "Costo per lead qualificato", "Lead consegnati a Nautilus EVO"];

const CONTROLLI: CalRow[] = [
  [-10, "Brief creativo e raccolta foto e video dei mezzi", "preparazione"],
  [-7, "Testi di landing, annunci, email e WhatsApp in revisione", "preparazione"],
  [-3, "Approvazione finale e prova del form (lead di test fino al CRM)", "preparazione"],
  [0, "Lancio della campagna", "lancio"],
];

export const SCENARI: Scenario[] = [
  {
    key: "salone",
    titolo: "Salone nautico",
    etichetta: "Salone / fiera",
    parole: [/salon/i, /fiera/i, /boat show/i, /expo/i],
    reparto: "VENDITA",
    soggettoDefault: "le novità della stagione",
    eventoAFine: true,
    budgetBase60gg: 3000,
    mix: [
      ["META", 45, "Inviti geolocalizzati nel raggio del salone e sul pubblico che segue la nautica"],
      ["EMAIL", 20, "Invito ai clienti e ai contatti con consenso marketing"],
      ["WHATSAPP", 15, "Promemoria dell'appuntamento allo stand, il messaggio più letto"],
      ["EVENTO", 20, "Raccolta contatti allo stand con modulo su tablet"],
    ],
    organici: [["ORGANICO", "Post e storie dallo stand, giorno per giorno"]],
    tassoQualifica: 0.55,
    kpiExtra: [
      { nome: "Appuntamenti fissati allo stand", quota: 0.5 },
      { nome: "Prove in mare dopo il salone", quota: 0.2 },
    ],
    audience: [
      { nome: "Acquirenti in valutazione", descrizione: "Hanno già un budget e vogliono vedere più modelli nello stesso giorno" },
      { nome: "Proprietari che cambiano barca", descrizione: "Valutano il passaggio a un modello più grande, spesso con permuta" },
      { nome: "Clienti Faieta Marine", descrizione: "Già clienti: vanno invitati per primi, con un motivo esclusivo per passare" },
    ],
    angolo: "Al salone non si compra una barca: si sceglie con calma con chi la conosce. Prenota il tuo momento allo stand.",
    promessa: "Un appuntamento riservato allo stand per vedere {s}, senza code e con le condizioni del salone.",
    hook: ["Al salone vieni a colpo sicuro: ti aspettiamo all'ora che scegli tu", "Le condizioni del salone, valide anche dopo, solo con l'appuntamento", "Porta i dati della tua barca: la valutiamo allo stand"],
    painPoint: ["Stand affollati e nessuno che ti segue davvero", "Troppi modelli e nessun confronto chiaro", "Paura di decidere sotto la pressione della fiera"],
    desideri: ["Vedere dal vivo più modelli in un giorno", "Un'offerta chiara da portare a casa", "Sapere quanto vale la propria barca"],
    obiezioni: [
      { obiezione: "Vado solo a guardare", risposta: "Perfetto: l'appuntamento serve proprio a guardare bene, senza impegno." },
      { obiezione: "Le offerte del salone sono solo marketing", risposta: "Mettiamo l'offerta per iscritto, con validità di 30 giorni dopo il salone." },
      { obiezione: "Non ho tempo di aspettare allo stand", risposta: "Con l'appuntamento non aspetti: hai un consulente dedicato all'ora scelta." },
    ],
    offerta: "Appuntamento riservato + biglietto o ingresso agevolato (se disponibile) + valutazione dell'usato allo stand",
    cta: "Prenota il tuo appuntamento allo stand",
    funnel: [
      ["LANDING", "Pagina salone", "Date, stand, modelli esposti e vantaggi dell'appuntamento"],
      ["FORM", "Scelta giorno e fascia oraria", "Giorno, ora, modello di interesse, barca attuale"],
      ["GRAZIE", "Conferma con promemoria", "Riepilogo, mappa dello stand, aggiunta al calendario"],
      ["WHATSAPP", "Promemoria il giorno prima", "Ora dell'appuntamento e nome del consulente"],
      ["EMAIL", "Follow-up dopo il salone", "Offerta scritta e invito alla prova in mare"],
    ],
    form: [F.nome, F.telefono, F.email, { nome: "giorno", etichetta: "Giorno della visita", tipo: "scelta", obbligatorio: true, opzioni: ["Da definire"] }, { nome: "interesse", etichetta: "Modello o tipo di barca che ti interessa", tipo: "testo", obbligatorio: false }, F.tempiVendita],
    calendario: [
      [-21, "Conferma stand, modelli esposti e disponibilità biglietti", "preparazione"],
      ...CONTROLLI,
      [1, "Email di invito ai clienti con consenso", "contenuto", "EMAIL"],
      [7, "Secondo invito con i modelli esposti", "contenuto", "META"],
      [-1, "Promemoria WhatsApp agli iscritti", "contenuto", "WHATSAPP", "fine"],
      [0, "Giorno del salone: appuntamenti allo stand e raccolta contatti", "contenuto", "EVENTO", "fine"],
      [3, "Follow-up con offerta scritta a tutti i contatti del salone", "contenuto", "EMAIL", "fine"],
    ],
    asset: ["Landing con prenotazione", "Carosello modelli esposti", "Video 15\" invito allo stand", "Email di invito", "Messaggio WhatsApp promemoria", "Modulo raccolta contatti su tablet", "Cartello QR allo stand"],
    metriche: [...METRICHE_BASE, "Appuntamenti prenotati", "Presenze effettive allo stand", "Prove in mare dopo il salone"],
    qualificazione: ["Telefono valido", "Modello o tipo di barca indicato", "Acquisto entro 12 mesi", "Appuntamento confermato"],
  },
  {
    key: "open-day",
    titolo: "Open day",
    etichetta: "Open day / evento",
    parole: [/open ?day/i, /evento/i, /giornata/i, /inaugura/i, /presentazione/i, /porte aperte/i],
    reparto: "VENDITA",
    soggettoDefault: "la nuova stagione",
    eventoAFine: true,
    budgetBase60gg: 2500,
    mix: [
      ["META", 55, "Inviti geolocalizzati tra Pescara, Chieti e Teramo, con video dell'anno scorso"],
      ["EMAIL", 15, "Invito a clienti e contatti con consenso marketing"],
      ["WHATSAPP", 10, "Conferme e promemoria: riduce le assenze"],
      ["EVENTO", 20, "Raccolta lead sul posto e piccoli costi di accoglienza"],
    ],
    organici: [["ORGANICO", "Conto alla rovescia sui social e storie in diretta"]],
    tassoQualifica: 0.5,
    kpiExtra: [
      { nome: "Presenze all'evento", quota: 0.7 },
      { nome: "Prove in mare durante l'evento", quota: 0.3 },
    ],
    audience: [
      { nome: "Famiglie e diportisti della costa", descrizione: "Pescara, Francavilla, Montesilvano, Ortona: vogliono vedere e provare senza impegno" },
      { nome: "Acquirenti con un modello in mente", descrizione: "Usano l'evento per provare e chiedere un'offerta" },
      { nome: "Clienti e proprietari", descrizione: "Occasione per tagliandi, accessori e permute" },
    ],
    angolo: "Una giornata in marina, non una vendita: vieni, sali a bordo e prova {s}.",
    promessa: "Prove in mare gratuite, novità della stagione e valutazione dell'usato, in una sola giornata.",
    hook: ["Sali a bordo, prova in mare, poi decidi", "Una giornata in marina per tutta la famiglia", "Porta la tua barca: la valutiamo sul posto"],
    painPoint: ["Difficile provare una barca prima di comprarla", "Il timore di essere 'agganciati' da un venditore", "Poco tempo libero nel weekend"],
    desideri: ["Provare in mare senza impegno", "Vedere tutti i modelli in un posto solo", "Passare una bella giornata"],
    obiezioni: [
      { obiezione: "Non sono pronto a comprare", risposta: "Non serve: è una giornata aperta, si viene per provare e conoscere." },
      { obiezione: "Il meteo potrebbe cambiare", risposta: "Se il mare non lo permette, ti avvisiamo e proponiamo un'altra data per la prova." },
      { obiezione: "Ci sarà troppa gente", risposta: "Con l'iscrizione scegli una fascia oraria e la prova è riservata." },
    ],
    offerta: "Iscrizione gratuita con fascia oraria + prova in mare riservata + condizioni valide solo per gli iscritti",
    cta: "Iscriviti all'open day",
    funnel: [
      ["LANDING", "Pagina evento", "Data, luogo, programma, modelli in prova"],
      ["FORM", "Iscrizione con fascia oraria", "Fascia oraria, persone, interesse per la prova in mare"],
      ["GRAZIE", "Conferma con QR", "QR d'ingresso e aggiunta al calendario"],
      ["WHATSAPP", "Promemoria e meteo", "Due giorni prima e la mattina stessa"],
      ["EMAIL", "Grazie e offerta", "Riepilogo dei modelli provati e condizioni riservate"],
    ],
    form: [F.nome, F.telefono, F.email, { nome: "fascia", etichetta: "Fascia oraria", tipo: "scelta", obbligatorio: true, opzioni: ["Mattina 10–13", "Pomeriggio 15–18"] }, { nome: "prova", etichetta: "Vuoi provare una barca in mare?", tipo: "scelta", obbligatorio: false, opzioni: ["Sì", "No, vengo a vedere"] }, F.tempiVendita],
    calendario: [
      [-30, "Permessi della marina, assicurazione e piano prove in mare", "preparazione"],
      ...CONTROLLI,
      [2, "Email di invito ai clienti con consenso", "contenuto", "EMAIL"],
      [10, "Video dell'evento precedente e conto alla rovescia", "contenuto", "META"],
      [-2, "Promemoria WhatsApp con meteo e programma", "contenuto", "WHATSAPP", "fine"],
      [0, "Giorno dell'evento: accoglienza, prove in mare, raccolta lead", "contenuto", "EVENTO", "fine"],
      [2, "Email di ringraziamento con le condizioni riservate", "contenuto", "EMAIL", "fine"],
    ],
    asset: ["Pagina evento con iscrizione", "QR d'ingresso", "Video invito 20\"", "Locandina A3 e post", "Email di invito e di ringraziamento", "Messaggi WhatsApp di promemoria", "Script per lo staff all'accoglienza"],
    metriche: [...METRICHE_BASE, "Iscritti", "Presenze (check-in QR)", "Prove in mare effettuate"],
    qualificazione: ["Telefono valido", "Richiesta di prova in mare", "Acquisto entro 12 mesi", "Presenza confermata all'evento"],
  },
  {
    key: "permuta",
    titolo: "Valutazione permuta",
    etichetta: "Permuta / valutazione",
    parole: [/permut/i, /valutaz/i, /valuta la/i, /quanto vale/i, /ritiro dell'usato/i],
    reparto: "VENDITA",
    soggettoDefault: "la tua barca",
    budgetBase60gg: 1500,
    mix: [
      ["GOOGLE", 50, "Chi cerca 'valutazione barca usata' o 'vendere gommone' ha già deciso di cambiare"],
      ["META", 40, "Proprietari di barca nella zona, con annunci prima/dopo"],
      ["EMAIL", 10, "Clienti con barca di 5+ anni"],
    ],
    organici: [["ORGANICO", "Annunci dell'usato su Subito.it e social con rimando alla valutazione"]],
    tassoQualifica: 0.65,
    kpiExtra: [
      { nome: "Valutazioni fatte", quota: 0.6 },
      { nome: "Trattative avviate su nuovo o usato", quota: 0.25 },
    ],
    audience: [
      { nome: "Proprietari che vogliono cambiare", descrizione: "Barca di 6–15 anni, pensano a un modello più grande o più recente" },
      { nome: "Chi vuole vendere e basta", descrizione: "Utile per lo stock usato: proporre acquisto diretto o conto vendita" },
      { nome: "Clienti Faieta Marine", descrizione: "Conosciamo la barca e la sua storia: valutazione più rapida" },
    ],
    angolo: "Sapere quanto vale {s} è il primo passo per cambiare barca: te lo diciamo in 48 ore, gratis.",
    promessa: "Valutazione gratuita di {s} in 48 ore, con ritiro in permuta se scegli una barca da noi.",
    hook: ["Quanto vale davvero la tua barca? Risposta in 48 ore", "Cambia barca senza l'ansia di vendere la vecchia", "Valutazione gratuita, anche solo per sapere"],
    painPoint: ["Vendere da privato è lento e pieno di perditempo", "Non si sa quanto chiedere", "Paura di una valutazione troppo bassa"],
    desideri: ["Un prezzo chiaro e onesto", "Cambiare barca con una sola trattativa", "Nessuna perdita di tempo"],
    obiezioni: [
      { obiezione: "Mi offrirete poco", risposta: "La valutazione è motivata, voce per voce: stato, ore motore, mercato. Decidi tu." },
      { obiezione: "Non so ancora se cambio barca", risposta: "La valutazione è gratuita e non impegna: serve proprio a decidere." },
      { obiezione: "La barca è lontana", risposta: "Bastano foto e dati per la prima stima; la verifica la facciamo noi." },
    ],
    offerta: "Valutazione gratuita in 48 ore con foto e dati + verifica in sede + permuta su nuovo e usato",
    cta: "Richiedi la valutazione gratuita",
    funnel: [
      ["LANDING", "Pagina valutazione", "Come funziona in 3 passi, tempi, esempi"],
      ["FORM", "Dati della barca", "Marca, modello, anno, motore e ore, foto"],
      ["GRAZIE", "Conferma", "Tempi di risposta e cosa preparare"],
      ["WHATSAPP", "Richiesta foto mancanti", "Messaggio del consulente entro 24 ore"],
      ["EMAIL", "Valutazione e proposta", "Stima motivata e invito in sede"],
    ],
    form: [F.nome, F.telefono, F.email, { nome: "barca", etichetta: "Marca, modello e anno della barca", tipo: "testo", obbligatorio: true }, { nome: "motore", etichetta: "Motore e ore", tipo: "testo", obbligatorio: false }, { nome: "obiettivo", etichetta: "Cosa vuoi fare?", tipo: "scelta", obbligatorio: true, opzioni: ["Cambiare barca", "Solo vendere", "Solo sapere quanto vale"] }, F.tempiVendita],
    calendario: [...CONTROLLI, [3, "Email ai clienti con barca di 5+ anni", "contenuto", "EMAIL"], [14, "Annuncio con caso reale di permuta", "contenuto", "META"]],
    asset: ["Landing valutazione", "Form con foto della barca", "3 annunci Google", "Annunci Meta prima/dopo", "Email clienti con barca datata", "Messaggio WhatsApp richiesta foto", "Scheda valutazione standard"],
    metriche: [...METRICHE_BASE, "Valutazioni consegnate entro 48 ore", "Valutazioni diventate trattative"],
    qualificazione: ["Telefono valido", "Marca, modello e anno indicati", "Obiettivo: cambiare barca o vendere", "Tempistica entro 12 mesi"],
  },
  {
    key: "noleggio",
    titolo: "Noleggio",
    etichetta: "Noleggio / charter",
    parole: [/nolegg/i, /charter/i, /affitt/i, /rent/i],
    reparto: "NOLEGGIO",
    soggettoDefault: "gommoni e barche a noleggio",
    budgetBase60gg: 1500,
    mix: [
      ["META", 50, "Turisti e residenti nel raggio della costa, da maggio a luglio"],
      ["GOOGLE", 40, "Ricerche 'noleggio gommone Pescara', 'barca senza patente'"],
      ["WHATSAPP", 10, "Conferme rapide: il noleggio si decide in poche ore"],
    ],
    organici: [["ORGANICO", "Contenuti sulla Costa dei Trabocchi e itinerari di mezza giornata"]],
    tassoQualifica: 0.7,
    kpiExtra: [
      { nome: "Preventivi di noleggio inviati", quota: 0.8 },
      { nome: "Noleggi confermati", quota: 0.35 },
    ],
    audience: [
      { nome: "Turisti estivi", descrizione: "In vacanza sulla costa, decidono in giornata o pochi giorni prima" },
      { nome: "Residenti senza barca", descrizione: "Pescara, Chieti, Teramo: una giornata in mare nel weekend" },
      { nome: "Gruppi e aziende", descrizione: "Uscite di gruppo, team building, feste" },
    ],
    angolo: "Il mare d'Abruzzo visto dall'acqua: {s}, anche senza patente fino a 40 cv.",
    promessa: "Preventivo di noleggio in giornata, con itinerario consigliato lungo la costa.",
    hook: ["Senza patente fino a 40 cv: guidi tu", "La Costa dei Trabocchi come non l'hai mai vista", "Mezza giornata in mare, rientro per pranzo"],
    painPoint: ["Non sapere se serve la patente", "Paura di non saper manovrare", "Prezzi poco chiari e cauzioni a sorpresa"],
    desideri: ["Una giornata diversa in famiglia o con amici", "Libertà di scegliere calette e orari", "Prezzo tutto incluso"],
    obiezioni: [
      { obiezione: "Non ho mai guidato una barca", risposta: "Prima di partire facciamo un breve briefing a bordo; fino a 40 cv non serve la patente." },
      { obiezione: "E se il mare è mosso?", risposta: "Se il meteo non lo permette spostiamo la data senza costi." },
      { obiezione: "Quanto costa davvero?", risposta: "Il preventivo indica tutto: noleggio, carburante, cauzione e cosa è incluso." },
    ],
    offerta: "Preventivo in giornata + itinerario consigliato + cambio data gratuito per meteo",
    cta: "Chiedi il preventivo di noleggio",
    funnel: [
      ["LANDING", "Pagina noleggio", "Flotta, patente sì/no, prezzi indicativi, itinerari"],
      ["FORM", "Richiesta preventivo", "Data, durata, persone, patente"],
      ["GRAZIE", "Conferma", "Tempi di risposta e documenti da portare"],
      ["WHATSAPP", "Preventivo", "Preventivo e disponibilità via WhatsApp"],
    ],
    form: [F.nome, F.telefono, F.email, { nome: "data", etichetta: "Data desiderata", tipo: "testo", obbligatorio: true }, { nome: "durata", etichetta: "Durata", tipo: "scelta", obbligatorio: true, opzioni: ["Mezza giornata", "Giornata intera", "Più giorni"] }, { nome: "persone", etichetta: "Quante persone?", tipo: "numero", obbligatorio: false }, { nome: "patente", etichetta: "Hai la patente nautica?", tipo: "scelta", obbligatorio: true, opzioni: ["Sì", "No"] }],
    calendario: [...CONTROLLI, [5, "Itinerari consigliati: post e storie", "contenuto", "ORGANICO"], [21, "Annuncio 'ultime date disponibili'", "contenuto", "META"]],
    asset: ["Landing noleggio", "Foto della flotta", "Video 15\" in navigazione", "Annunci Google per zona", "Messaggio WhatsApp con preventivo", "Scheda documenti e cauzione"],
    metriche: [...METRICHE_BASE, "Preventivi inviati entro 2 ore", "Noleggi confermati", "Giorni di flotta occupati"],
    qualificazione: ["Telefono valido", "Data indicata", "Durata e numero di persone", "Risposta sulla patente"],
  },
  {
    key: "manutenzione",
    titolo: "Manutenzione",
    etichetta: "Manutenzione / service",
    parole: [/manutenz/i, /tagliand/i, /rimessagg/i, /\bvaro\b/i, /antivegetativ/i, /assistenza/i, /officina/i, /\bservice\b/i, /revisione motore/i],
    reparto: "SERVICE",
    soggettoDefault: "la tua barca",
    budgetBase60gg: 800,
    mix: [
      ["EMAIL", 30, "Clienti dell'officina e proprietari con consenso: il canale più economico"],
      ["WHATSAPP", 25, "Promemoria personali con la scadenza del tagliando"],
      ["META", 45, "Proprietari di barca nel raggio di 40 km dalla sede"],
    ],
    organici: [["ORGANICO", "Consigli pratici di manutenzione: video brevi dall'officina"]],
    tassoQualifica: 0.75,
    kpiExtra: [
      { nome: "Lavori prenotati", quota: 0.6 },
      { nome: "Nuovi clienti dell'officina", quota: 0.25 },
    ],
    audience: [
      { nome: "Clienti dell'officina", descrizione: "Hanno fatto lavori negli ultimi 2 anni: tagliando, varo, rimessaggio" },
      { nome: "Proprietari ormeggiati in zona", descrizione: "Marina di Pescara, Ortona, Vasto, Giulianova: barca in acqua da preparare" },
      { nome: "Chi ha comprato da noi", descrizione: "Tagliandi programmati 20 h, 100 h e annuali" },
    ],
    angolo: "La stagione si gioca a marzo: chi prenota prima, va in mare prima. Prepara {s} senza code.",
    promessa: "Il primo weekend di sole sei già in mare: manutenzione di {s} con preventivo chiaro e data di consegna garantita.",
    hook: ["Chi prenota a marzo naviga ad aprile", "Tagliando, antivegetativa e varo: una sola prenotazione", "Preventivo prima di iniziare, nessuna sorpresa"],
    painPoint: ["A maggio le officine sono piene e i tempi si allungano", "Preventivi vaghi e conti finali più alti", "Barca ferma in piena stagione per un guasto evitabile"],
    desideri: ["Barca pronta quando serve", "Sapere prima quanto si spende", "Un'officina che conosce il motore"],
    obiezioni: [
      { obiezione: "Lo faccio da solo", risposta: "Per i lavori semplici va benissimo; per il motore la garanzia richiede tagliandi documentati." },
      { obiezione: "Costa troppo", risposta: "Preventivo con ore stimate e ricambi prima di iniziare: decidi tu cosa fare." },
      { obiezione: "C'è tempo", risposta: "Le date di marzo e aprile si esauriscono: prenotare non costa nulla." },
    ],
    offerta: "Preventivo gratuito + data di consegna garantita per chi prenota entro la scadenza della campagna",
    cta: "Prenota il tagliando di primavera",
    funnel: [
      ["LANDING", "Pagina manutenzione", "Servizi, tempi, come prenotare"],
      ["FORM", "Dati del mezzo e lavori", "Barca, motore, ore, lavori richiesti, dove si trova"],
      ["GRAZIE", "Conferma", "Chi ti richiama e quando"],
      ["WHATSAPP", "Preventivo e data", "Messaggio dell'accettazione con data proposta"],
    ],
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Barca e motore (marca, modello, ore)", tipo: "testo", obbligatorio: true }, { nome: "lavori", etichetta: "Lavori richiesti", tipo: "scelta", obbligatorio: true, opzioni: ["Tagliando motore", "Antivegetativa e carena", "Varo / alaggio", "Rimessaggio", "Altro"] }, F.zona, F.tempiService],
    calendario: [...CONTROLLI, [1, "Email ai clienti dell'officina con la scadenza", "contenuto", "EMAIL"], [3, "WhatsApp personali ai clienti con tagliando in scadenza", "contenuto", "WHATSAPP"], [20, "Promemoria 'ultime date disponibili'", "contenuto", "EMAIL"]],
    asset: ["Landing prenotazione", "Email ai clienti dell'officina", "Messaggi WhatsApp personalizzati", "Video 30\" dall'officina", "Annunci Meta per zona", "Listino servizi principali"],
    metriche: [...METRICHE_BASE, "Prenotazioni confermate", "Valore medio dei preventivi", "Tempo di risposta dell'accettazione"],
    qualificazione: ["Telefono valido", "Barca e motore indicati", "Lavoro richiesto", "Tempistica indicata"],
  },
  {
    key: "prova-mare",
    titolo: "Prova in mare",
    etichetta: "Prova in mare",
    parole: [/prova in mare/i, /prove in mare/i, /test drive/i, /\bprov[ae]\b/i],
    reparto: "VENDITA",
    soggettoDefault: "la barca che ti interessa",
    budgetBase60gg: 2000,
    mix: [
      ["META", 55, "Video in navigazione al pubblico interessato a nautica nel raggio di 60 km"],
      ["GOOGLE", 35, "Chi cerca il modello o la categoria: intenzione d'acquisto alta"],
      ["WHATSAPP", 10, "Conferma della prova e gestione meteo"],
    ],
    organici: [["ORGANICO", "Video delle prove reali con i clienti (con consenso)"]],
    tassoQualifica: 0.6,
    kpiExtra: [
      { nome: "Prove in mare effettuate", quota: 0.45 },
      { nome: "Trattative dopo la prova", quota: 0.2 },
    ],
    audience: [
      { nome: "Acquirenti con budget", descrizione: "Hanno ristretto la scelta a 2–3 modelli e vogliono provarli" },
      { nome: "Chi cambia barca", descrizione: "Proprietari che passano a un modello più grande, spesso con permuta" },
      { nome: "Nuovi diportisti", descrizione: "Prima barca: la prova toglie i dubbi su guida e comfort" },
    ],
    angolo: "Una barca si sceglie in mare, non in foto: prova {s} con un nostro tecnico a bordo.",
    promessa: "Prova in mare di {s} con un tecnico a bordo, nella data che scegli tu.",
    hook: ["Le foto non bastano: prova in mare", "Un'ora a bordo vale più di dieci brochure", "Scegli la data, al resto pensiamo noi"],
    painPoint: ["Paura di sbagliare un acquisto importante", "Non sapere come si comporta la barca con il mare formato", "Concessionari che non fanno provare"],
    desideri: ["Sentire la barca prima di decidere", "Un confronto onesto tra modelli", "Coinvolgere la famiglia nella scelta"],
    obiezioni: [
      { obiezione: "Non voglio essere messo sotto pressione", risposta: "La prova non impegna a nulla: serve a capire se è la barca giusta." },
      { obiezione: "E se il meteo è brutto?", risposta: "Ti avvisiamo il giorno prima e spostiamo la data." },
      { obiezione: "Non so ancora quale modello", risposta: "Nel form indichi uso e budget: ti proponiamo noi i modelli da provare." },
    ],
    offerta: "Prova in mare gratuita con tecnico a bordo + confronto tra 2 modelli + valutazione della permuta",
    cta: "Prenota la prova in mare",
    funnel: [
      ["LANDING", "Pagina prova in mare", "Modelli disponibili, come funziona, porto di partenza"],
      ["FORM", "Richiesta prova", "Modello, data preferita, esperienza, budget"],
      ["GRAZIE", "Conferma", "Il consulente ti chiama per fissare data e porto"],
      ["WHATSAPP", "Conferma e meteo", "Conferma il giorno prima con previsioni"],
      ["EMAIL", "Dopo la prova", "Scheda del modello provato e proposta"],
    ],
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Modello o tipo di barca da provare", tipo: "testo", obbligatorio: true }, F.budget, F.tempiVendita, F.zona],
    calendario: [...CONTROLLI, [7, "Video di una prova reale", "contenuto", "META"], [14, "Nuove date di prova disponibili", "contenuto", "WHATSAPP"]],
    asset: ["Landing prova in mare", "Video verticale 30\" in navigazione", "Carosello modelli da provare", "3 annunci Google per modello", "Messaggio WhatsApp di conferma con meteo", "Email post-prova"],
    metriche: [...METRICHE_BASE, "Prove fissate", "Prove effettuate (non rinviate)", "Trattative aperte dopo la prova"],
    qualificazione: ["Telefono valido", "Modello o tipo indicato", "Budget indicato", "Acquisto entro 6 mesi"],
  },
  {
    key: "prima-barca",
    titolo: "Guida alla prima barca",
    etichetta: "Prima barca",
    parole: [/prima barca/i, /guida all.acquisto/i, /principiant/i, /neofit/i, /come scegliere/i],
    reparto: "VENDITA",
    soggettoDefault: "la prima barca",
    budgetBase60gg: 1500,
    mix: [
      ["META", 70, "Pubblico ampio interessato al mare: la guida è un primo passo leggero"],
      ["GOOGLE", 30, "Ricerche 'quale barca comprare', 'gommone per principianti'"],
    ],
    organici: [["ORGANICO", "Estratti della guida in post e video brevi"]],
    tassoQualifica: 0.4,
    kpiExtra: [{ nome: "Consulenze richieste dopo la guida", quota: 0.3 }],
    audience: [
      { nome: "Famiglie che vogliono una barca", descrizione: "Prima esperienza: patente, ormeggio, costi" },
      { nome: "Giovani diportisti", descrizione: "Gommone o barca piccola, budget contenuto" },
      { nome: "Chi ha noleggiato", descrizione: "Hanno provato il noleggio e pensano all'acquisto" },
    ],
    angolo: "Prima di scegliere {s}, sapere cosa costa davvero: patente, ormeggio, assicurazione e manutenzione.",
    promessa: "La guida gratuita per scegliere {s} senza errori, con i costi veri di un anno.",
    hook: ["Quanto costa davvero una barca in un anno?", "Patente sì o no? La risposta in 2 minuti", "I 7 errori di chi compra la prima barca"],
    painPoint: ["Troppe informazioni contrastanti", "Costi nascosti dopo l'acquisto", "Non sapere da dove iniziare"],
    desideri: ["Scegliere con sicurezza", "Un budget chiaro", "Qualcuno di cui fidarsi"],
    obiezioni: [
      { obiezione: "È solo un modo per vendermi qualcosa", risposta: "La guida è utile anche se compri altrove: i numeri sono quelli del mercato." },
      { obiezione: "Non so se me la posso permettere", risposta: "Nella guida c'è un esempio di costi annui per 3 fasce di budget." },
    ],
    offerta: "Guida PDF gratuita + calcolo dei costi annui + consulenza senza impegno",
    cta: "Scarica la guida gratuita",
    funnel: [
      ["LANDING", "Pagina guida", "Indice della guida e per chi è"],
      ["FORM", "Download", "Nome, contatti, che tipo di barca immagini"],
      ["GRAZIE", "Scarica la guida", "Link al PDF e invito alla consulenza"],
      ["EMAIL", "Sequenza di 3 email", "Costi, patente, ormeggio; poi invito alla consulenza"],
    ],
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Che tipo di barca immagini?", tipo: "scelta", obbligatorio: false, opzioni: ["Gommone", "Barca open", "Cabinato", "Barca a vela", "Non lo so ancora"] }, F.budget, F.tempiVendita],
    calendario: [[-14, "Scrittura e impaginazione della guida PDF", "preparazione"], ...CONTROLLI, [3, "Prima email della sequenza", "contenuto", "EMAIL"], [10, "Video 'quanto costa una barca in un anno'", "contenuto", "META"]],
    asset: ["Guida PDF", "Landing download", "Sequenza di 3 email", "Video 30\" sui costi", "Annunci Meta con estratto della guida"],
    metriche: [...METRICHE_BASE, "Download della guida", "Aperture della sequenza email", "Consulenze richieste"],
    qualificazione: ["Telefono valido", "Tipo di barca indicato", "Budget indicato", "Acquisto entro 12 mesi"],
  },
  {
    key: "finanziamento",
    titolo: "Calcolo rata",
    etichetta: "Rata / finanziamento",
    parole: [/\brat[ae]\b/i, /finanziam/i, /leasing/i, /pagamento a rate/i],
    reparto: "VENDITA",
    soggettoDefault: "la barca che desideri",
    budgetBase60gg: 1500,
    mix: [
      ["META", 60, "Pubblico interessato alla nautica con annunci sulla rata mensile"],
      ["GOOGLE", 40, "Ricerche 'barca a rate', 'finanziamento gommone'"],
    ],
    organici: [["ORGANICO", "Esempi di rata su modelli in stock"]],
    tassoQualifica: 0.55,
    kpiExtra: [{ nome: "Richieste di piano personalizzato", quota: 0.5 }],
    audience: [
      { nome: "Acquirenti con liquidità limitata", descrizione: "Preferiscono una rata a un esborso unico" },
      { nome: "Professionisti e aziende", descrizione: "Valutano il leasing per motivi fiscali" },
    ],
    angolo: "Con la rata giusta, il sogno di {s} è più vicino di quanto pensi.",
    promessa: "Calcola in un minuto la rata per {s} e ricevi un piano personalizzato.",
    hook: ["Quanto costa al mese la tua barca?", "Anticipo, durata, rata: calcolalo ora", "Leasing nautico: conviene davvero?"],
    painPoint: ["Prezzo totale che spaventa", "Non sapere quali soluzioni esistono", "Paura di condizioni poco chiare"],
    desideri: ["Una rata sostenibile", "Condizioni trasparenti", "Partire già da questa stagione"],
    obiezioni: [
      { obiezione: "I tassi sono alti", risposta: "Il calcolo è indicativo; il piano personalizzato confronta più soluzioni." },
      { obiezione: "Non voglio legarmi per anni", risposta: "Si può scegliere la durata e prevedere un maxi-riscatto o estinzione anticipata." },
    ],
    offerta: "Calcolatore della rata + piano personalizzato senza impegno",
    cta: "Calcola la tua rata",
    funnel: [
      ["LANDING", "Calcolatore", "Prezzo, anticipo, durata: rata indicativa"],
      ["FORM", "Piano personalizzato", "Contatti e modello di interesse"],
      ["GRAZIE", "Conferma", "Il consulente ti richiama con le soluzioni"],
    ],
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Modello di interesse", tipo: "testo", obbligatorio: false }, F.budget, F.tempiVendita],
    calendario: [...CONTROLLI, [7, "Esempi di rata su 3 modelli in stock", "contenuto", "META"]],
    asset: ["Calcolatore della rata", "Annunci con esempio di rata", "Email con piano personalizzato", "Avvertenza: rata indicativa, soggetta ad approvazione"],
    metriche: [...METRICHE_BASE, "Calcoli effettuati", "Piani personalizzati richiesti"],
    qualificazione: ["Telefono valido", "Budget o modello indicato", "Acquisto entro 6 mesi"],
  },
  {
    key: "referral",
    titolo: "Presenta un amico",
    etichetta: "Referral",
    parole: [/referral/i, /presenta un amico/i, /passaparola/i, /porta un amico/i],
    reparto: "VENDITA",
    soggettoDefault: "un amico appassionato di mare",
    soggettoFisso: true,
    budgetBase60gg: 600,
    mix: [
      ["REFERRAL", 70, "Premi per chi presenta un amico che diventa cliente"],
      ["EMAIL", 20, "Invito ai clienti soddisfatti"],
      ["WHATSAPP", 10, "Messaggio facile da inoltrare"],
    ],
    organici: [["ORGANICO", "Storie di clienti (con consenso)"]],
    tassoQualifica: 0.7,
    kpiExtra: [{ nome: "Amici diventati clienti", quota: 0.2 }],
    audience: [
      { nome: "Clienti soddisfatti", descrizione: "Hanno acquistato o fatto lavori nell'ultimo anno" },
      { nome: "Amici dei clienti", descrizione: "Arrivano con fiducia: il lead più caldo che esista" },
    ],
    angolo: "Il miglior consiglio arriva da chi va già in mare con noi.",
    promessa: "Presenta {s}: se diventa cliente, un premio per te e un vantaggio per lui.",
    hook: ["Un amico, due vantaggi", "Chi va per mare consiglia chi conosce", "Il tuo prossimo tagliando lo offriamo noi"],
    painPoint: ["Gli amici chiedono consigli e non si sa chi indicare", "Premi complicati da ottenere"],
    desideri: ["Essere riconosciuti come clienti fedeli", "Aiutare un amico a scegliere bene"],
    obiezioni: [
      { obiezione: "Non mi va di 'vendere' agli amici", risposta: "Non vendi nulla: lasci solo il contatto, al resto pensiamo noi." },
      { obiezione: "Il premio arriverà davvero?", risposta: "Regole scritte e semplici: premio alla prima pratica completata dell'amico." },
    ],
    offerta: "Buono servizi per chi presenta + vantaggio di benvenuto per l'amico",
    cta: "Presenta un amico",
    funnel: [
      ["LANDING", "Pagina referral", "Regole, premi, come funziona"],
      ["FORM", "Segnalazione", "Tuoi dati e dati dell'amico (con il suo consenso)"],
      ["WHATSAPP", "Messaggio da inoltrare", "Testo pronto per l'amico"],
    ],
    form: [F.nome, F.telefono, { nome: "amico", etichetta: "Nome dell'amico", tipo: "testo", obbligatorio: true }, { nome: "telefonoAmico", etichetta: "Telefono dell'amico", tipo: "telefono", obbligatorio: true }, { nome: "interesse", etichetta: "Cosa cerca l'amico?", tipo: "testo", obbligatorio: false }],
    calendario: [[-10, "Regolamento del premio e verifica privacy", "preparazione"], ...CONTROLLI.slice(1), [1, "Email ai clienti dell'ultimo anno", "contenuto", "EMAIL"]],
    asset: ["Landing referral", "Regolamento", "Email ai clienti", "Messaggio WhatsApp da inoltrare", "Buono servizi"],
    metriche: [...METRICHE_BASE, "Segnalazioni ricevute", "Amici diventati clienti", "Premi consegnati"],
    qualificazione: ["Telefono dell'amico valido", "Consenso dell'amico al contatto", "Interesse indicato"],
  },
  {
    key: "riattivazione",
    titolo: "Riattivazione clienti",
    etichetta: "Riattivazione",
    parole: [/riattiv/i, /clienti passati/i, /ex clienti/i, /clienti inattivi/i, /recuper/i],
    reparto: "VENDITA",
    soggettoDefault: "la tua barca",
    soggettoFisso: true,
    budgetBase60gg: 400,
    mix: [
      ["EMAIL", 50, "Lista clienti con consenso marketing"],
      ["WHATSAPP", 30, "Messaggi personali: tasso di risposta alto"],
      ["META", 20, "Pubblico personalizzato dai clienti (solo con consenso)"],
    ],
    organici: [],
    tassoQualifica: 0.7,
    kpiExtra: [{ nome: "Clienti tornati attivi", quota: 0.4 }],
    audience: [
      { nome: "Clienti senza pratiche da 2 anni", descrizione: "Hanno comprato o fatto lavori, poi più nulla" },
      { nome: "Proprietari di barche datate", descrizione: "Mezzo di 8+ anni: candidati a permuta o refit" },
    ],
    angolo: "Ti ricordi di noi? Noi della tua barca sì: ecco cosa possiamo fare per la prossima stagione.",
    promessa: "Un controllo e un'offerta riservata per {s}, per ripartire con la stagione.",
    hook: ["È passato un po': come sta la tua barca?", "Un'offerta solo per chi è già stato nostro cliente", "Controllo gratuito per i clienti storici"],
    painPoint: ["Barca ferma da tempo", "Motore che non parte al primo colpo", "Pensare di cambiare ma rimandare"],
    desideri: ["Essere ricordati", "Un vantaggio riservato", "Ripartire senza pensieri"],
    obiezioni: [
      { obiezione: "Mi trovo già con un'altra officina", risposta: "Nessun problema: l'offerta è valida anche solo per un controllo." },
      { obiezione: "Non uso più la barca", risposta: "Possiamo valutarla per vendita o permuta." },
    ],
    offerta: "Controllo gratuito o vantaggio riservato ai clienti storici, valido fino a fine campagna",
    cta: "Richiedi la tua offerta riservata",
    funnel: [
      ["EMAIL", "Email personale", "Nome, barca, ultima pratica e offerta"],
      ["LANDING", "Pagina offerta", "Dettagli dell'offerta e scadenza"],
      ["FORM", "Richiesta", "Conferma contatti e cosa serve"],
      ["WHATSAPP", "Richiamo", "Messaggio a chi ha aperto ma non risposto"],
    ],
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Cosa ti serve?", tipo: "scelta", obbligatorio: true, opzioni: ["Controllo / tagliando", "Valutare la permuta", "Vendere la barca", "Altro"] }, F.messaggio],
    calendario: [[-7, "Estrazione della lista clienti con consenso marketing", "preparazione"], ...CONTROLLI.slice(1), [1, "Prima email", "contenuto", "EMAIL"], [8, "WhatsApp a chi non ha risposto", "contenuto", "WHATSAPP"]],
    asset: ["Lista clienti con consenso", "Email personalizzata", "Landing offerta", "Messaggio WhatsApp"],
    metriche: [...METRICHE_BASE, "Aperture email", "Risposte WhatsApp", "Clienti tornati attivi"],
    qualificazione: ["Telefono valido", "Esigenza indicata", "Cliente con consenso marketing"],
  },
];

/** Scenario di ripiego quando l'obiettivo non corrisponde a nessun modello. */
export const SCENARIO_GENERICO: Scenario = {
  ...SCENARI.find((s) => s.key === "prova-mare")!,
  key: "consulenza",
  titolo: "Consulenza",
  etichetta: "Consulenza personalizzata",
  parole: [],
  soggettoDefault: "la barca giusta",
  angolo: "Scegliere {s} è più semplice con un consulente che conosce il mare d'Abruzzo.",
  promessa: "Una consulenza personalizzata per trovare {s}, gratuita e senza impegno.",
  offerta: "Consulenza gratuita in sede o al telefono + proposta di 2–3 modelli adatti",
  cta: "Richiedi una consulenza",
  kpiExtra: [{ nome: "Consulenze fissate", quota: 0.5 }],
};
