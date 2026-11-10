import type { Reparto } from "@/lib/enums";

/**
 * I 9 tipi di evento/iniziativa offline. Ogni tipo porta con sé ciò che serve per organizzarlo:
 * checklist logistica, copione per lo staff, inviti, promemoria e follow-up.
 * Nei testi i segnaposto {evento} {data} {ora} {luogo} {link} {azienda} vengono sostituiti
 * con i dati dell'evento (vedi compila()).
 */
export type Messaggio = { giorni: number; canale: "EMAIL" | "WHATSAPP"; titolo: string; testo: string };

export type TipoEvento = {
  key: string;
  nome: string;
  icona: "door" | "sailboat" | "tent" | "video" | "users" | "sparkles" | "wrench" | "anchor" | "briefcase";
  descrizione: string;
  reparto: Reparto;
  /** Proposta di partenza per l'obiettivo dell'evento. */
  obiettivo: string;
  /** Interessi proposti nel form di iscrizione e di raccolta sul posto. */
  interessi: string[];
  checklist: string[];
  copione: string[];
  /** giorni < 0 = prima dell'evento (inviti, promemoria); giorni > 0 = dopo (follow-up). */
  messaggi: Messaggio[];
  /** Iscrizione: il form chiede la fascia oraria (prove in mare, giornate tecniche). */
  fasceOrarie?: string[];
};

const PROMEMORIA_STANDARD: Messaggio[] = [
  { giorni: -1, canale: "WHATSAPP", titolo: "Promemoria il giorno prima", testo: "Ciao, ti ricordiamo {evento}: domani {data} alle {ora} a {luogo}. Se non riesci a venire rispondi pure a questo messaggio, così liberiamo il posto. A domani! {azienda}" },
];

export const TIPI_EVENTO: TipoEvento[] = [
  {
    key: "open-day",
    nome: "Open day",
    icona: "door",
    descrizione: "Porte aperte in concessionaria o in marina: barche in esposizione, consulenze, offerte del giorno.",
    reparto: "VENDITA",
    obiettivo: "Raccogliere lead con budget e tempistica, fissare prove in mare nei 15 giorni successivi.",
    interessi: ["Barca nuova", "Barca usata", "Permuta della mia barca", "Finanziamento", "Solo curiosità"],
    checklist: [
      "Permessi e spazio in marina confermati",
      "Barche in esposizione pulite e con cartellino prezzo",
      "Gazebo, bandiere e totem con QR di iscrizione",
      "Tablet carichi con la pagina di raccolta lead",
      "Turni staff e venditori definiti",
      "Rinfresco / acqua ordinati",
      "Moduli privacy di riserva stampati",
      "Fotografo o video per i social",
    ],
    copione: [
      "Accogli entro 30 secondi: «Benvenuto, è la prima volta da noi?»",
      "Chiedi che barca usa oggi (o se è la prima) e dove naviga.",
      "Mostra al massimo 2 barche coerenti con il budget dichiarato.",
      "Proponi una data per la prova in mare prima che vada via.",
      "Registra il contatto sul tablet: nome, telefono, interesse, budget, tempistica.",
      "Spunta il consenso privacy solo se il cliente lo conferma a voce o lo seleziona lui.",
    ],
    messaggi: [
      { giorni: -14, canale: "EMAIL", titolo: "Invito", testo: "Oggetto: Ti aspettiamo: {evento}\n\nCiao,\nil {data} dalle {ora} apriamo le porte a {luogo}: barche in esposizione, consulenze con i nostri esperti e condizioni riservate a chi partecipa.\n\nIscriviti qui, ci vuole un minuto: {link}\n\nA presto,\n{azienda}" },
      { giorni: -7, canale: "WHATSAPP", titolo: "Invito WhatsApp", testo: "Ciao! Il {data} dalle {ora} a {luogo} c'è «{evento}». Barche da vedere da vicino e consulenze senza impegno. Ti tengo un posto? {link}" },
      ...PROMEMORIA_STANDARD,
      { giorni: 1, canale: "WHATSAPP", titolo: "Grazie e prova in mare", testo: "Grazie per essere passato a «{evento}»! Se vuoi provare in acqua la barca che hai visto, rispondi con il giorno che preferisci e ti fissiamo l'uscita. {azienda}" },
      { giorni: 3, canale: "EMAIL", titolo: "Riepilogo e proposta", testo: "Oggetto: Le barche che hai visto a «{evento}»\n\nCiao,\nti riepiloghiamo le proposte di cui abbiamo parlato. Le condizioni dell'evento restano valide per 15 giorni: rispondi a questa email o chiamaci per fissare una prova in mare.\n\n{azienda}" },
    ],
  },
  {
    key: "prova-mare",
    nome: "Prova in mare",
    icona: "sailboat",
    descrizione: "Giornata di uscite in acqua su appuntamento, a turni, con un istruttore a bordo.",
    reparto: "VENDITA",
    obiettivo: "Riempire tutti i turni di prova e trasformare almeno un terzo delle uscite in trattativa.",
    interessi: ["Gommone", "Open / day cruiser", "Cabinato", "Barca senza patente"],
    fasceOrarie: ["9:00–10:30", "10:30–12:00", "14:30–16:00", "16:00–17:30"],
    checklist: [
      "Barche prova con carburante, dotazioni e assicurazione",
      "Previsioni meteo e mare controllate 48 ore prima",
      "Turni assegnati e confermati a tutti gli iscritti",
      "Skipper/istruttore per ogni barca",
      "Giubbotti salvagente in tutte le taglie",
      "Modulo di presa visione rischi da firmare all'imbarco",
      "Piano B in caso di maltempo (nuova data comunicata)",
    ],
    copione: [
      "Prima di salire: briefing sicurezza di 2 minuti.",
      "Lascia guidare il cliente appena possibile: è lì per sentire la barca.",
      "Chiedi cosa ha apprezzato e cosa manca rispetto alla sua barca attuale.",
      "Al rientro proponi un preventivo con data: «Te lo mando entro domani?»",
      "Annota sul tablet l'interesse e la tempistica dichiarata.",
    ],
    messaggi: [
      { giorni: -10, canale: "EMAIL", titolo: "Invito", testo: "Oggetto: Prova in mare il {data}\n\nCiao,\nil {data} a {luogo} organizziamo uscite di prova da 90 minuti con un nostro istruttore a bordo. I turni sono pochi: scegli il tuo qui {link}\n\n{azienda}" },
      { giorni: -2, canale: "WHATSAPP", titolo: "Conferma turno", testo: "Ciao! Ti confermiamo la prova in mare del {data} a {luogo}. Ti aspettiamo 15 minuti prima del tuo turno con scarpe con suola chiara. Se il mare non lo permette ti avvisiamo noi. {azienda}" },
      ...PROMEMORIA_STANDARD,
      { giorni: 1, canale: "WHATSAPP", titolo: "Com'è andata", testo: "Ciao, com'è andata la prova di ieri? Se vuoi ti preparo un preventivo con la configurazione che ti è piaciuta. {azienda}" },
    ],
  },
  {
    key: "salone",
    nome: "Salone nautico",
    icona: "tent",
    descrizione: "Stand a un salone o una fiera di settore: grande afflusso, contatti da qualificare in fretta.",
    reparto: "VENDITA",
    obiettivo: "Raccogliere contatti qualificati e fissare appuntamenti in sede nelle due settimane successive.",
    interessi: ["Barca nuova", "Barca usata", "Motore fuoribordo", "Permuta", "Rimessaggio e assistenza"],
    checklist: [
      "Contratto stand e pass espositori",
      "Trasporto e varo delle barche in esposizione",
      "Grafiche stand e totem con QR",
      "Listini e schede prodotto aggiornati",
      "Turni staff per tutti i giorni del salone",
      "Tablet e connessione (hotspot di riserva)",
      "Biglietti omaggio da inviare ai clienti",
      "Agenda appuntamenti post-salone pronta",
    ],
    copione: [
      "Qualifica in 2 minuti: che barca, dove naviga, quando vuole acquistare.",
      "Con chi è «solo curioso» lascia materiale e registra il contatto con consenso.",
      "Con chi ha tempistica entro 6 mesi fissa subito un appuntamento in sede.",
      "Registra ogni contatto sul tablet prima di passare al successivo.",
    ],
    messaggi: [
      { giorni: -21, canale: "EMAIL", titolo: "Biglietto omaggio", testo: "Oggetto: Il tuo ingresso omaggio: {evento}\n\nCiao,\nsaremo a «{evento}» ({luogo}) a partire da {data}. Abbiamo un ingresso omaggio per te: richiedilo qui {link} e passa a trovarci allo stand.\n\n{azienda}" },
      { giorni: -3, canale: "WHATSAPP", titolo: "Ci vediamo allo stand", testo: "Ciao! Da {data} siamo a «{evento}». Se vuoi fissare un orario per vedere le barche con calma, rispondi a questo messaggio. {azienda}" },
      { giorni: 2, canale: "EMAIL", titolo: "Grazie per la visita", testo: "Oggetto: Grazie per essere passato al nostro stand\n\nCiao,\ngrazie della visita al nostro stand a «{evento}». Le condizioni salone restano valide fino a fine mese: rispondi per fissare un appuntamento in sede o una prova in mare.\n\n{azienda}" },
    ],
  },
  {
    key: "webinar",
    nome: "Webinar",
    icona: "video",
    descrizione: "Incontro online su un tema (prima barca, patente, finanziamento, manutenzione).",
    reparto: "VENDITA",
    obiettivo: "Educare il pubblico e ottenere richieste di consulenza individuale.",
    interessi: ["Prima barca", "Patente nautica", "Finanziamento / leasing", "Manutenzione fai da te"],
    checklist: [
      "Piattaforma scelta e link di accesso creato",
      "Slide pronte e riviste",
      "Relatore e moderatore confermati",
      "Prova tecnica audio/video il giorno prima",
      "Registrazione attivata (con avviso ai partecipanti)",
      "Domande frequenti preparate",
    ],
    copione: [
      "Apri con la promessa: cosa sapranno fare alla fine.",
      "Rispondi alle domande in chat ogni 15 minuti.",
      "Chiudi con un'offerta chiara: consulenza individuale gratuita.",
    ],
    messaggi: [
      { giorni: -10, canale: "EMAIL", titolo: "Invito", testo: "Oggetto: Webinar gratuito il {data} alle {ora}\n\nCiao,\nil {data} alle {ora} parliamo di «{evento}» in un incontro online di 45 minuti, con domande in diretta. Iscriviti qui: {link}\n\n{azienda}" },
      { giorni: -1, canale: "EMAIL", titolo: "Promemoria", testo: "Oggetto: Domani alle {ora}: {evento}\n\nCiao,\nti ricordiamo il webinar di domani alle {ora}. Il link per collegarti arriva un'ora prima.\n\n{azienda}" },
      { giorni: 1, canale: "EMAIL", titolo: "Registrazione e consulenza", testo: "Oggetto: La registrazione del webinar\n\nCiao,\ngrazie per aver partecipato (o per esserti iscritto). Se vuoi approfondire il tuo caso, prenota una consulenza individuale gratuita rispondendo a questa email.\n\n{azienda}" },
    ],
  },
  {
    key: "evento-clienti",
    nome: "Evento clienti",
    icona: "users",
    descrizione: "Serata o uscita per chi ha già acquistato: fidelizzazione e passaparola (referral).",
    reparto: "VENDITA",
    obiettivo: "Rafforzare il rapporto con i clienti e raccogliere segnalazioni di amici interessati.",
    interessi: ["Cambio barca", "Accessori ed elettronica", "Rimessaggio", "Porto un amico"],
    checklist: [
      "Lista invitati (solo clienti con consenso marketing)",
      "Location e catering confermati",
      "Omaggio per i partecipanti",
      "Cartoline «porta un amico» con QR",
      "Foto e liberatorie",
    ],
    copione: [
      "Ringrazia ogni cliente per nome.",
      "Chiedi come va la barca e se serve assistenza.",
      "Proponi la cartolina «porta un amico» a chi è soddisfatto.",
    ],
    messaggi: [
      { giorni: -15, canale: "EMAIL", titolo: "Invito riservato", testo: "Oggetto: Una serata per i nostri clienti\n\nCiao,\nil {data} alle {ora} a {luogo} ci ritroviamo con i clienti {azienda}. Conferma la tua presenza qui: {link}. Puoi portare un amico appassionato di mare.\n\n{azienda}" },
      ...PROMEMORIA_STANDARD,
      { giorni: 2, canale: "WHATSAPP", titolo: "Grazie", testo: "Grazie per essere stato con noi a «{evento}»! Se un amico cerca una barca, segnalacelo: avrete entrambi un vantaggio. {azienda}" },
    ],
  },
  {
    key: "presentazione-modello",
    nome: "Presentazione nuovo modello",
    icona: "sparkles",
    descrizione: "Anteprima di un modello appena arrivato, con visite a bordo e condizioni di lancio.",
    reparto: "VENDITA",
    obiettivo: "Generare pre-ordini e prove in mare sul nuovo modello.",
    interessi: ["Nuovo modello in presentazione", "Altri modelli della gamma", "Permuta", "Finanziamento"],
    checklist: [
      "Barca consegnata, preparata e fotografata",
      "Schede tecniche e listino di lancio",
      "Video e foto per i social prima dell'evento",
      "Rappresentante del cantiere (se disponibile)",
      "Turni di visita a bordo",
    ],
    copione: [
      "Racconta le 3 novità principali in meno di un minuto.",
      "Invita a salire a bordo a piccoli gruppi.",
      "Proponi la prova in mare e le condizioni di lancio con scadenza.",
    ],
    messaggi: [
      { giorni: -12, canale: "EMAIL", titolo: "Anteprima", testo: "Oggetto: In anteprima da noi: {evento}\n\nCiao,\nil {data} alle {ora} presentiamo a {luogo} un modello appena arrivato. Posti limitati per le visite a bordo: prenota il tuo qui {link}\n\n{azienda}" },
      ...PROMEMORIA_STANDARD,
      { giorni: 1, canale: "WHATSAPP", titolo: "Condizioni di lancio", testo: "Grazie per essere venuto alla presentazione! Le condizioni di lancio valgono fino a fine mese: vuoi fissare una prova in mare? {azienda}" },
    ],
  },
  {
    key: "giornata-manutenzione",
    nome: "Giornata manutenzione",
    icona: "wrench",
    descrizione: "Check-up gratuiti o corsi pratici in officina: porta nuovi clienti al service.",
    reparto: "SERVICE",
    obiettivo: "Riempire l'agenda dell'officina per tagliandi e rimessaggi della stagione.",
    interessi: ["Tagliando motore", "Antivegetativa e carena", "Impianto elettrico", "Rimessaggio invernale"],
    fasceOrarie: ["Mattina", "Pomeriggio"],
    checklist: [
      "Disponibilità meccanici e spazio in officina",
      "Lista dei controlli gratuiti inclusi",
      "Listino tagliandi e rimessaggio aggiornato",
      "Agenda officina aperta per le prenotazioni",
      "Kit omaggio (es. anodi, liquido lavavetri marino)",
    ],
    copione: [
      "Chiedi marca, modello e ore del motore.",
      "Mostra cosa hai controllato e cosa suggerisci, con prezzo.",
      "Proponi una data in agenda prima che vada via.",
    ],
    messaggi: [
      { giorni: -10, canale: "WHATSAPP", titolo: "Invito", testo: "Ciao! Il {data} a {luogo} facciamo check-up gratuiti di motore e impianti. Prenota il tuo orario qui: {link} {azienda}" },
      ...PROMEMORIA_STANDARD,
      { giorni: 2, canale: "WHATSAPP", titolo: "Esito e preventivo", testo: "Ciao, ti mandiamo il riepilogo del check-up. Se vuoi fissare l'intervento prima dell'alta stagione rispondi con il giorno che preferisci. {azienda}" },
    ],
  },
  {
    key: "evento-charter",
    nome: "Evento charter",
    icona: "anchor",
    descrizione: "Presentazione della flotta a noleggio, uscite di gruppo o giornate per aziende.",
    reparto: "NOLEGGIO",
    obiettivo: "Raccogliere prenotazioni anticipate per la stagione di noleggio.",
    interessi: ["Noleggio giornaliero", "Noleggio settimanale", "Con skipper", "Evento aziendale in barca"],
    checklist: [
      "Flotta pronta e disponibile per le visite",
      "Calendario disponibilità stagione aggiornato",
      "Listino e condizioni di noleggio",
      "Skipper per le uscite dimostrative",
      "Codice sconto per prenotazioni anticipate",
    ],
    copione: [
      "Chiedi date, numero di persone e se hanno la patente.",
      "Proponi la barca giusta e controlla subito la disponibilità.",
      "Blocca l'opzione con il codice sconto valido 7 giorni.",
    ],
    messaggi: [
      { giorni: -10, canale: "EMAIL", titolo: "Invito", testo: "Oggetto: Scopri la flotta {azienda}\n\nCiao,\nil {data} a {luogo} presentiamo le barche a noleggio della prossima stagione, con uscite dimostrative. Iscriviti qui: {link}\n\n{azienda}" },
      ...PROMEMORIA_STANDARD,
      { giorni: 1, canale: "WHATSAPP", titolo: "Codice prenotazione anticipata", testo: "Grazie per essere venuto! Il codice per la prenotazione anticipata vale 7 giorni: dimmi date e numero di persone e verifico la disponibilità. {azienda}" },
    ],
  },
  {
    key: "evento-b2b",
    nome: "Evento B2B",
    icona: "briefcase",
    descrizione: "Incontro con aziende, marine, diving o noleggiatori: flotte, forniture, convenzioni.",
    reparto: "VENDITA",
    obiettivo: "Aprire trattative per flotte o convenzioni con aziende del territorio.",
    interessi: ["Fornitura flotta", "Assistenza per flotte", "Convenzione dipendenti", "Partnership"],
    checklist: [
      "Lista aziende invitate con referente",
      "Presentazione aziendale e casi di successo",
      "Sala riunioni e attrezzatura video",
      "Proposta commerciale tipo per flotte",
      "Agenda incontri individuali",
    ],
    copione: [
      "Chiedi quante unità gestiscono e chi decide gli acquisti.",
      "Raccogli il nome dell'azienda e il ruolo del referente.",
      "Fissa un incontro di approfondimento entro 2 settimane.",
    ],
    messaggi: [
      { giorni: -14, canale: "EMAIL", titolo: "Invito", testo: "Oggetto: Incontro riservato alle aziende della nautica\n\nBuongiorno,\nil {data} alle {ora} a {luogo} presentiamo soluzioni per flotte e servizi dedicati alle aziende. Conferma la partecipazione qui: {link}\n\nCordiali saluti,\n{azienda}" },
      { giorni: -2, canale: "EMAIL", titolo: "Promemoria", testo: "Oggetto: Promemoria incontro del {data}\n\nBuongiorno,\nle ricordiamo l'incontro del {data} alle {ora} a {luogo}.\n\n{azienda}" },
      { giorni: 3, canale: "EMAIL", titolo: "Proposta", testo: "Oggetto: La nostra proposta per la sua azienda\n\nBuongiorno,\ngrazie per la partecipazione. Come concordato le invieremo una proposta su misura: ci indica il momento migliore per sentirci?\n\n{azienda}" },
    ],
  },
];

export const getTipoEvento = (key: string) => TIPI_EVENTO.find((t) => t.key === key);

/** Il tipo è libero nel database: chiavi sconosciute ricadono sull'open day. */
export const tipoOrDefault = (key: string) => getTipoEvento(key) ?? TIPI_EVENTO[0];

export type DatiEvento = { nome: string; data: string; ora: string; luogo: string; link?: string; azienda?: string };

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

/** "2027-04-18" → "domenica 18 aprile" (data letta come calendario, senza fuso). */
export function dataLunga(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${GIORNI[wd]} ${d} ${MESI[m - 1]}`;
}

export function compila(testo: string, e: DatiEvento) {
  return testo
    .replaceAll("{evento}", e.nome)
    .replaceAll("{data}", dataLunga(e.data))
    .replaceAll("{ora}", e.ora)
    .replaceAll("{luogo}", e.luogo)
    .replaceAll("{link}", e.link || "[link di iscrizione]")
    .replaceAll("{azienda}", e.azienda || "Faieta Marine");
}
