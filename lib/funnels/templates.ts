/* ============================================================================
   Libreria dei 12 funnel pronti per Faieta Marine.
   I modelli vivono nel codice (versionati, sempre uguali per tutti); quando
   l'utente sceglie "Usa questo modello" ne nasce una copia modificabile nel database.

   Segnaposto nei testi di email e WhatsApp:
     {nome}        nome del contatto
     {consulente}  chi segue il contatto (es. Marco)
     {data}        data richiesta (solo noleggio)
   I nomi dei campi del form coincidono con quelli della raccolta lead (/api/lead):
   nome, cognome, telefono, email, interesse, budgetFascia, tempistica, zona, messaggio.
   Gli altri campi finiscono nelle "risposte" del lead e quindi nelle note del CRM.
   ============================================================================ */
import type { FormField, FunnelEmail, FunnelStep, FunnelWhatsapp, Reparto } from "@/db/schema";

export const CATEGORIE = ["Vendita", "Service", "Noleggio", "Eventi", "Fidelizzazione"] as const;
export type Categoria = (typeof CATEGORIE)[number];

export type FunnelTemplate = {
  key: string;
  nome: string;
  categoria: Categoria;
  reparto: Reparto;
  obiettivo: string;
  pubblico: string;
  promessa: string;
  leadMagnet: string;
  cta: string;
  steps: FunnelStep[];
  form: FormField[];
  emails: FunnelEmail[];
  whatsapp: FunnelWhatsapp[];
  qualificazione: string[];
  /** Conversione tipica attesa della landing (riferimento per i controlli, non una promessa). */
  conversioneAttesa: string;
};

/** Campi che la raccolta lead riconosce: i funnel non possono toglierli né rinominarli. */
export const CAMPI_OBBLIGATORI = ["nome", "telefono"] as const;
/** Campi con un significato preciso per punteggio e CRM. */
export const CAMPI_NOTI = ["nome", "cognome", "azienda", "telefono", "email", "interesse", "budgetFascia", "tempistica", "zona", "messaggio"] as const;

const F = {
  nome: { nome: "nome", etichetta: "Nome e cognome", tipo: "testo", obbligatorio: true },
  telefono: { nome: "telefono", etichetta: "Telefono (anche WhatsApp)", tipo: "telefono", obbligatorio: true },
  email: { nome: "email", etichetta: "Email", tipo: "email", obbligatorio: false },
  zona: { nome: "zona", etichetta: "Dove navighi o dove tieni la barca", tipo: "testo", obbligatorio: false },
  budget: { nome: "budgetFascia", etichetta: "Budget indicativo (€)", tipo: "scelta", obbligatorio: false, opzioni: ["Fino a 20.000", "20.000–50.000", "50.000–100.000", "Oltre 100.000"] },
  tempiVendita: { nome: "tempistica", etichetta: "Quando pensi di acquistare?", tipo: "scelta", obbligatorio: true, opzioni: ["Entro 3 mesi", "Entro 6 mesi", "Entro 12 mesi", "Sto solo guardando"] },
  tempiService: { nome: "tempistica", etichetta: "Quando ti serve?", tipo: "scelta", obbligatorio: true, opzioni: ["Urgente", "Entro il mese", "Prossima stagione"] },
  messaggio: { nome: "messaggio", etichetta: "Vuoi aggiungere qualcosa?", tipo: "area", obbligatorio: false },
} satisfies Record<string, FormField>;

const passi = (...p: [FunnelStep["tipo"], string, string][]): FunnelStep[] => p.map(([tipo, titolo, descrizione], i) => ({ ordine: i + 1, tipo, titolo, descrizione }));

export const FUNNEL_TEMPLATES: FunnelTemplate[] = [
  {
    key: "prova-mare",
    nome: "Richiedi una prova in mare",
    categoria: "Vendita",
    reparto: "VENDITA",
    obiettivo: "Trasformare chi sta valutando un modello in una prova in mare fissata.",
    pubblico: "Acquirenti con 2–3 modelli in mente, chi cambia barca, nuovi diportisti con budget.",
    promessa: "Prova in mare con un tecnico a bordo, nella data che scegli tu.",
    leadMagnet: "Prova in mare gratuita + confronto tra due modelli",
    cta: "Prenota la prova in mare",
    steps: passi(
      ["LANDING", "Pagina prova in mare", "Modelli disponibili, porto di partenza, come funziona, testimonianze"],
      ["FORM", "Richiesta prova", "Modello, data preferita, budget, tempistica"],
      ["GRAZIE", "Conferma", "Chi ti chiamerà e cosa portare (documento, scarpe adatte)"],
      ["WHATSAPP", "Conferma e meteo", "Il giorno prima, con la previsione del mare"],
      ["EMAIL", "Dopo la prova", "Scheda del modello e proposta personalizzata"],
    ),
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Modello o tipo di barca da provare", tipo: "testo", obbligatorio: true }, { nome: "dataPreferita", etichetta: "Quando preferisci?", tipo: "scelta", obbligatorio: false, opzioni: ["Infrasettimanale", "Sabato", "Domenica", "Indifferente"] }, F.budget, F.tempiVendita],
    emails: [
      { giorno: 0, oggetto: "La tua prova in mare: ecco i prossimi passi", testo: "Ciao {nome}, grazie per la richiesta. {consulente} ti chiamerà entro un giorno lavorativo per fissare data e porto. Se il meteo non permette di uscire, sposteremo la prova senza problemi." },
      { giorno: 2, oggetto: "Cosa guardare durante una prova in mare", testo: "Ciao {nome}, ecco 5 cose da osservare a bordo: posizione di guida, comportamento in virata, spazio per chi viaggia con te, rumore del motore, facilità di ormeggio. Portale con te il giorno della prova." },
      { giorno: 7, oggetto: "Hai ancora dubbi sul modello?", testo: "Ciao {nome}, se non hai ancora fissato la prova o vuoi confrontare un altro modello, rispondi a questa email: ti proponiamo noi le date disponibili." },
    ],
    whatsapp: [
      { momento: "Entro 1 ora dalla richiesta", testo: "Ciao {nome}, sono {consulente} di Faieta Marine. Ho ricevuto la tua richiesta di prova in mare: quando ti posso chiamare per fissare la data?" },
      { momento: "Il giorno prima della prova", testo: "Ciao {nome}, ti confermo la prova di domani. Il mare è previsto calmo: ci vediamo al porto all'orario stabilito. Per qualsiasi cosa scrivimi qui." },
    ],
    qualificazione: ["Telefono valido", "Modello o tipo indicato", "Budget indicato", "Acquisto entro 6 mesi"],
    conversioneAttesa: "6–10% delle visite",
  },
  {
    key: "permuta",
    nome: "Valuta la tua barca per permuta",
    categoria: "Vendita",
    reparto: "VENDITA",
    obiettivo: "Raccogliere i dati di barche da valutare per avviare una permuta o un ritiro.",
    pubblico: "Proprietari di barche di 6–15 anni che pensano di cambiare o vendere.",
    promessa: "Valutazione gratuita della tua barca in 48 ore, con ritiro in permuta.",
    leadMagnet: "Valutazione motivata in 48 ore",
    cta: "Richiedi la valutazione gratuita",
    steps: passi(
      ["LANDING", "Pagina valutazione", "Come funziona in 3 passi, tempi, cosa serve"],
      ["FORM", "Dati della barca", "Marca, modello, anno, motore e ore, cosa vuoi fare"],
      ["GRAZIE", "Conferma", "Tempi di risposta e foto da preparare"],
      ["WHATSAPP", "Richiesta foto", "Il consulente chiede le foto mancanti"],
      ["EMAIL", "Valutazione", "Stima motivata e invito in sede"],
    ),
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Marca, modello e anno della barca", tipo: "testo", obbligatorio: true }, { nome: "motore", etichetta: "Motore e ore", tipo: "testo", obbligatorio: false }, { nome: "obiettivoPermuta", etichetta: "Cosa vuoi fare?", tipo: "scelta", obbligatorio: true, opzioni: ["Cambiare barca", "Solo vendere", "Solo sapere quanto vale"] }, F.tempiVendita],
    emails: [
      { giorno: 0, oggetto: "Abbiamo ricevuto i dati della tua barca", testo: "Ciao {nome}, grazie. Per una valutazione precisa ci servono 4 foto: scafo di lato, plancia, motore, interni. Puoi mandarle rispondendo a questa email o su WhatsApp." },
      { giorno: 2, oggetto: "La valutazione della tua barca", testo: "Ciao {nome}, {consulente} ti invierà la valutazione motivata voce per voce. Se vuoi, possiamo vedere la barca dal vivo per confermarla." },
      { giorno: 10, oggetto: "Hai pensato a cosa fare con la tua barca?", testo: "Ciao {nome}, se stai valutando un modello nuovo o usato, possiamo prepararti una proposta che tiene già conto della permuta." },
    ],
    whatsapp: [
      { momento: "Entro 24 ore", testo: "Ciao {nome}, sono {consulente} di Faieta Marine. Per la valutazione della tua barca mi mandi qui 4 foto (scafo, plancia, motore, interni)? Grazie!" },
      { momento: "Dopo la valutazione", testo: "Ciao {nome}, ti ho inviato la valutazione per email. Se vuoi ne parliamo a voce o in sede, quando ti è comodo." },
    ],
    qualificazione: ["Telefono valido", "Marca, modello e anno indicati", "Obiettivo: cambiare barca o vendere", "Tempistica entro 12 mesi"],
    conversioneAttesa: "8–14% delle visite",
  },
  {
    key: "preventivo-noleggio",
    nome: "Preventivo noleggio",
    categoria: "Noleggio",
    reparto: "NOLEGGIO",
    obiettivo: "Ricevere richieste di noleggio complete di data, durata e persone.",
    pubblico: "Turisti estivi, residenti senza barca, gruppi e aziende.",
    promessa: "Preventivo di noleggio in giornata, con itinerario consigliato.",
    leadMagnet: "Preventivo in giornata + itinerario lungo la Costa dei Trabocchi",
    cta: "Chiedi il preventivo",
    steps: passi(
      ["LANDING", "Pagina noleggio", "Flotta, patente sì/no, cosa è incluso, itinerari"],
      ["FORM", "Richiesta preventivo", "Data, durata, persone, patente"],
      ["GRAZIE", "Conferma", "Risposta in giornata, documenti e cauzione"],
      ["WHATSAPP", "Preventivo", "Preventivo e disponibilità"],
    ),
    form: [F.nome, F.telefono, F.email, { nome: "data", etichetta: "Data desiderata", tipo: "testo", obbligatorio: true }, { nome: "durata", etichetta: "Durata", tipo: "scelta", obbligatorio: true, opzioni: ["Mezza giornata", "Giornata intera", "Più giorni"] }, { nome: "persone", etichetta: "Quante persone?", tipo: "numero", obbligatorio: false }, { nome: "patente", etichetta: "Hai la patente nautica?", tipo: "scelta", obbligatorio: true, opzioni: ["Sì", "No"] }],
    emails: [
      { giorno: 0, oggetto: "Il tuo preventivo di noleggio", testo: "Ciao {nome}, abbiamo ricevuto la richiesta. Ti mandiamo preventivo e disponibilità in giornata. Ricorda: fino a 40 cv non serve la patente nautica." },
      { giorno: 1, oggetto: "Un itinerario per la tua giornata in mare", testo: "Ciao {nome}, ecco un itinerario di mezza giornata dal porto di Pescara verso i trabocchi, con le soste consigliate." },
    ],
    whatsapp: [
      { momento: "Entro 2 ore", testo: "Ciao {nome}, sono {consulente} di Faieta Marine. Per il {data} abbiamo disponibilità: ti mando il preventivo qui?" },
      { momento: "Il giorno prima", testo: "Ciao {nome}, ti aspettiamo domani. Porta un documento d'identità e, se ce l'hai, la patente nautica. Mare previsto calmo." },
    ],
    qualificazione: ["Telefono valido", "Data indicata", "Durata e persone indicate", "Risposta sulla patente"],
    conversioneAttesa: "10–18% delle visite",
  },
  {
    key: "guida-prima-barca",
    nome: "Guida all'acquisto della prima barca",
    categoria: "Vendita",
    reparto: "VENDITA",
    obiettivo: "Raccogliere contatti di chi pensa alla prima barca e accompagnarli verso una consulenza.",
    pubblico: "Famiglie e giovani diportisti alla prima esperienza, chi ha già noleggiato.",
    promessa: "La guida gratuita per scegliere la prima barca senza errori, con i costi veri di un anno.",
    leadMagnet: "Guida PDF: patente, ormeggio, costi annui, errori da evitare",
    cta: "Scarica la guida gratuita",
    steps: passi(
      ["LANDING", "Pagina guida", "Indice della guida, per chi è, anteprima delle pagine"],
      ["FORM", "Download", "Contatti e tipo di barca immaginata"],
      ["GRAZIE", "Scarica la guida", "Link al PDF e invito alla consulenza"],
      ["EMAIL", "Sequenza educativa", "Costi, patente, ormeggio, poi invito alla consulenza"],
    ),
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Che tipo di barca immagini?", tipo: "scelta", obbligatorio: false, opzioni: ["Gommone", "Barca open", "Cabinato", "Barca a vela", "Non lo so ancora"] }, F.budget, F.tempiVendita],
    emails: [
      { giorno: 0, oggetto: "La tua guida alla prima barca", testo: "Ciao {nome}, ecco la guida. Inizia dal capitolo sui costi annui: è quello che sorprende di più." },
      { giorno: 3, oggetto: "Patente nautica: serve davvero?", testo: "Ciao {nome}, fino a 40 cv e 10 metri non serve la patente. Ecco quando conviene comunque prenderla e quanto tempo richiede." },
      { giorno: 7, oggetto: "Dove tenere la barca: ormeggio, carrello o rimessaggio", testo: "Ciao {nome}, ogni soluzione ha costi e comodità diverse. Ecco un confronto con i prezzi tipici sulla nostra costa." },
      { giorno: 12, oggetto: "Vuoi un parere su misura?", testo: "Ciao {nome}, se vuoi capire quale barca fa per te, {consulente} ti offre una consulenza gratuita in sede o al telefono." },
    ],
    whatsapp: [{ momento: "Dopo l'ultima email, solo con consenso", testo: "Ciao {nome}, sono {consulente} di Faieta Marine. Ti è stata utile la guida? Se vuoi ti aiuto a capire quale barca fa per te." }],
    qualificazione: ["Telefono valido", "Tipo di barca indicato", "Budget indicato", "Acquisto entro 12 mesi"],
    conversioneAttesa: "15–25% delle visite",
  },
  {
    key: "checklist-manutenzione",
    nome: "Checklist manutenzione primaverile",
    categoria: "Service",
    reparto: "SERVICE",
    obiettivo: "Portare in officina i proprietari prima della stagione, partendo da una checklist utile.",
    pubblico: "Proprietari ormeggiati in zona, clienti dell'officina, chi ha comprato da noi.",
    promessa: "La checklist per preparare la barca alla stagione, e un'officina pronta a farlo per te.",
    leadMagnet: "Checklist PDF di 20 controlli prima del varo",
    cta: "Scarica la checklist",
    steps: passi(
      ["LANDING", "Pagina checklist", "Cosa controllare prima del varo, cosa fare da soli e cosa no"],
      ["FORM", "Download e dati della barca", "Barca, motore, lavori che pensi di fare"],
      ["GRAZIE", "Scarica la checklist", "Link al PDF e prenotazione del tagliando"],
      ["WHATSAPP", "Proposta dell'accettazione", "Data disponibile e preventivo"],
    ),
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Barca e motore (marca, modello, ore)", tipo: "testo", obbligatorio: true }, { nome: "lavori", etichetta: "Cosa pensi di fare?", tipo: "scelta", obbligatorio: false, opzioni: ["Tagliando motore", "Antivegetativa e carena", "Varo", "Non lo so, voglio un controllo"] }, F.zona, F.tempiService],
    emails: [
      { giorno: 0, oggetto: "La tua checklist di primavera", testo: "Ciao {nome}, ecco la checklist. I controlli con il simbolo della chiave inglese è meglio farli fare all'officina: servono attrezzi e registrazione per la garanzia." },
      { giorno: 4, oggetto: "Le date di marzo e aprile si stanno riempiendo", testo: "Ciao {nome}, chi prenota ora il tagliando va in mare per primo. Rispondi con il tipo di lavoro e ti proponiamo una data." },
    ],
    whatsapp: [{ momento: "Entro 1 giorno lavorativo", testo: "Ciao {nome}, sono {consulente} dell'officina Faieta Marine. Per la tua barca possiamo proporti una data per il tagliando: ti interessa?" }],
    qualificazione: ["Telefono valido", "Barca e motore indicati", "Lavoro richiesto o controllo", "Tempistica indicata"],
    conversioneAttesa: "12–20% delle visite",
  },
  {
    key: "open-day",
    nome: "Open day in marina",
    categoria: "Eventi",
    reparto: "VENDITA",
    obiettivo: "Iscrivere persone all'open day con fascia oraria e interesse per la prova in mare.",
    pubblico: "Famiglie e diportisti della costa, acquirenti con un modello in mente, clienti.",
    promessa: "Una giornata in marina: prove in mare, novità e valutazione dell'usato.",
    leadMagnet: "Iscrizione gratuita con prova in mare riservata",
    cta: "Iscriviti all'open day",
    steps: passi(
      ["LANDING", "Pagina evento", "Data, luogo, programma, modelli in prova"],
      ["FORM", "Iscrizione", "Fascia oraria, persone, prova in mare"],
      ["GRAZIE", "Conferma con QR", "QR d'ingresso e aggiunta al calendario"],
      ["WHATSAPP", "Promemoria", "Due giorni prima e la mattina stessa"],
      ["EMAIL", "Dopo l'evento", "Ringraziamento e condizioni riservate agli iscritti"],
    ),
    form: [F.nome, F.telefono, F.email, { nome: "fascia", etichetta: "Fascia oraria", tipo: "scelta", obbligatorio: true, opzioni: ["Mattina 10–13", "Pomeriggio 15–18"] }, { nome: "persone", etichetta: "Quante persone?", tipo: "numero", obbligatorio: false }, { nome: "interesse", etichetta: "Vuoi provare un modello in particolare?", tipo: "testo", obbligatorio: false }, F.tempiVendita],
    emails: [
      { giorno: 0, oggetto: "Sei iscritto all'open day", testo: "Ciao {nome}, ti aspettiamo. In allegato il QR d'ingresso: mostralo all'accoglienza. Se cambi programma, avvisaci per liberare il posto." },
      { giorno: 1, oggetto: "Il programma della giornata", testo: "Ciao {nome}, ecco orari delle prove in mare, modelli presenti e dove parcheggiare." },
    ],
    whatsapp: [
      { momento: "Due giorni prima", testo: "Ciao {nome}, ci vediamo all'open day! Il mare è previsto calmo. Ricordi la tua fascia oraria?" },
      { momento: "Il giorno dopo", testo: "Ciao {nome}, grazie per essere passato. Se vuoi rivedere il modello provato o ricevere l'offerta riservata, scrivimi qui." },
    ],
    qualificazione: ["Telefono valido", "Interesse per una prova o un modello", "Acquisto entro 12 mesi", "Presenza confermata"],
    conversioneAttesa: "15–25% delle visite",
  },
  {
    key: "quiz-barca",
    nome: "Quiz: quale imbarcazione fa per te?",
    categoria: "Vendita",
    reparto: "VENDITA",
    obiettivo: "Coinvolgere chi è indeciso e consegnare al venditore un profilo già chiaro.",
    pubblico: "Chi è all'inizio della ricerca e non sa ancora che tipo di barca scegliere.",
    promessa: "5 domande, 2 minuti: scopri la barca adatta a come vivi il mare.",
    leadMagnet: "Risultato personalizzato con 2–3 modelli consigliati",
    cta: "Fai il quiz",
    steps: passi(
      ["LANDING", "Pagina quiz", "Promessa, durata del quiz, esempio di risultato"],
      ["QUIZ", "5 domande", "Uso, persone a bordo, patente, budget, tempi"],
      ["FORM", "Dove mandiamo il risultato", "Nome e telefono"],
      ["GRAZIE", "Il tuo risultato", "Tipo di barca consigliato e modelli disponibili"],
      ["EMAIL", "Scheda dei modelli", "Approfondimento sui modelli consigliati"],
    ),
    form: [
      { nome: "uso", etichetta: "Come userai la barca?", tipo: "scelta", obbligatorio: true, opzioni: ["Bagni e relax sotto costa", "Pesca", "Sport acquatici", "Gite di più giorni"] },
      { nome: "personeBordo", etichetta: "Quante persone a bordo di solito?", tipo: "scelta", obbligatorio: true, opzioni: ["1–2", "3–5", "6 o più"] },
      { nome: "patente", etichetta: "Hai la patente nautica?", tipo: "scelta", obbligatorio: true, opzioni: ["Sì", "No", "La prenderò"] },
      F.budget,
      F.tempiVendita,
      F.nome,
      F.telefono,
      F.email,
    ],
    emails: [
      { giorno: 0, oggetto: "Il risultato del tuo quiz", testo: "Ciao {nome}, in base alle tue risposte ti consigliamo questo tipo di barca. Qui trovi i modelli disponibili e le differenze principali." },
      { giorno: 3, oggetto: "Vuoi vederli dal vivo?", testo: "Ciao {nome}, i modelli del tuo risultato sono visibili in sede e alcuni si possono provare in mare. Rispondi per fissare un appuntamento." },
    ],
    whatsapp: [{ momento: "Entro 1 giorno lavorativo", testo: "Ciao {nome}, sono {consulente} di Faieta Marine. Ho visto il risultato del tuo quiz: ti va se ti mando un paio di modelli adatti con prezzo e disponibilità?" }],
    qualificazione: ["Telefono valido", "Quiz completato", "Budget indicato", "Acquisto entro 12 mesi"],
    conversioneAttesa: "20–35% di chi inizia il quiz",
  },
  {
    key: "calcolatore-rata",
    nome: "Calcolatore di budget e rata",
    categoria: "Vendita",
    reparto: "VENDITA",
    obiettivo: "Far scoprire la rata mensile e raccogliere chi vuole un piano personalizzato.",
    pubblico: "Acquirenti che preferiscono una rata, professionisti e aziende interessati al leasing.",
    promessa: "Calcola in un minuto la rata per la barca che desideri.",
    leadMagnet: "Calcolatore + piano personalizzato senza impegno",
    cta: "Calcola la tua rata",
    steps: passi(
      ["LANDING", "Pagina calcolatore", "Prezzo, anticipo, durata: rata indicativa subito"],
      ["CALCOLATORE", "Calcolo", "Rata indicativa, con avvertenza sull'approvazione"],
      ["FORM", "Piano personalizzato", "Contatti e modello di interesse"],
      ["GRAZIE", "Conferma", "Il consulente ti richiama con le soluzioni"],
    ),
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Modello di interesse", tipo: "testo", obbligatorio: false }, { nome: "formula", etichetta: "Ti interessa", tipo: "scelta", obbligatorio: false, opzioni: ["Finanziamento", "Leasing", "Non so, consigliatemi"] }, F.budget, F.tempiVendita],
    emails: [
      { giorno: 0, oggetto: "Il tuo calcolo della rata", testo: "Ciao {nome}, ecco il riepilogo del calcolo. La rata è indicativa: il piano personalizzato confronta più soluzioni ed è soggetto all'approvazione della finanziaria." },
      { giorno: 4, oggetto: "Finanziamento o leasing?", testo: "Ciao {nome}, ecco in breve le differenze tra le due formule e per chi conviene l'una o l'altra." },
    ],
    whatsapp: [{ momento: "Entro 1 giorno lavorativo", testo: "Ciao {nome}, sono {consulente} di Faieta Marine. Ho visto il tuo calcolo: vuoi che ti prepari un piano con due o tre soluzioni a confronto?" }],
    qualificazione: ["Telefono valido", "Budget o modello indicato", "Acquisto entro 6 mesi"],
    conversioneAttesa: "8–15% di chi usa il calcolatore",
  },
  {
    key: "consulenza",
    nome: "Richiedi una consulenza personalizzata",
    categoria: "Vendita",
    reparto: "VENDITA",
    obiettivo: "Fissare un appuntamento con chi vuole un parere esperto prima di scegliere.",
    pubblico: "Acquirenti indecisi, chi cambia categoria di barca, aziende.",
    promessa: "Una consulenza gratuita per trovare la barca giusta, senza impegno.",
    leadMagnet: "Consulenza in sede o al telefono con 2–3 modelli proposti",
    cta: "Richiedi una consulenza",
    steps: passi(
      ["LANDING", "Pagina consulenza", "Chi ti segue, come funziona, cosa ottieni"],
      ["FORM", "Richiesta", "Esigenze, budget, preferenza in sede o al telefono"],
      ["GRAZIE", "Conferma", "Ti chiamiamo per fissare il giorno"],
      ["EMAIL", "Preparazione", "Cosa portare o preparare per la consulenza"],
    ),
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Cosa stai cercando?", tipo: "area", obbligatorio: true }, { nome: "modalita", etichetta: "Preferisci", tipo: "scelta", obbligatorio: false, opzioni: ["In sede a Pescara", "Al telefono", "Videochiamata"] }, F.budget, F.tempiVendita],
    emails: [{ giorno: 0, oggetto: "La tua consulenza con Faieta Marine", testo: "Ciao {nome}, {consulente} ti contatterà per fissare il giorno. Se hai già foto o link di barche che ti piacciono, portali: aiutano a capire i tuoi gusti." }],
    whatsapp: [{ momento: "Entro 1 giorno lavorativo", testo: "Ciao {nome}, sono {consulente} di Faieta Marine. Quando ti farebbe comodo la consulenza?" }],
    qualificazione: ["Telefono valido", "Esigenza descritta", "Budget indicato", "Acquisto entro 12 mesi"],
    conversioneAttesa: "5–9% delle visite",
  },
  {
    key: "riattivazione",
    nome: "Riattivazione clienti passati",
    categoria: "Fidelizzazione",
    reparto: "VENDITA",
    obiettivo: "Riportare in contatto i clienti senza pratiche da due anni o più.",
    pubblico: "Clienti con consenso marketing senza acquisti o lavori recenti.",
    promessa: "Un controllo e un'offerta riservata per ripartire con la stagione.",
    leadMagnet: "Controllo gratuito o vantaggio riservato ai clienti storici",
    cta: "Richiedi l'offerta riservata",
    steps: passi(
      ["EMAIL", "Email personale", "Nome, barca, ultima pratica e offerta"],
      ["LANDING", "Pagina offerta", "Dettagli dell'offerta e scadenza"],
      ["FORM", "Richiesta", "Conferma contatti ed esigenza"],
      ["WHATSAPP", "Richiamo", "A chi ha aperto l'email ma non ha risposto"],
    ),
    form: [F.nome, F.telefono, F.email, { nome: "interesse", etichetta: "Cosa ti serve?", tipo: "scelta", obbligatorio: true, opzioni: ["Controllo / tagliando", "Valutare la permuta", "Vendere la barca", "Altro"] }, F.messaggio],
    emails: [
      { giorno: 0, oggetto: "{nome}, come sta la tua barca?", testo: "Ciao {nome}, è passato un po' dall'ultima volta. Per i clienti storici abbiamo riservato un controllo gratuito prima della stagione. Basta rispondere a questa email." },
      { giorno: 7, oggetto: "L'offerta riservata scade a breve", testo: "Ciao {nome}, ti ricordo l'offerta per i clienti storici: è valida fino a fine campagna." },
    ],
    whatsapp: [{ momento: "Dopo 8 giorni, a chi non ha risposto", testo: "Ciao {nome}, sono {consulente} di Faieta Marine. Ti avevo scritto per un controllo gratuito alla tua barca: ti interessa?" }],
    qualificazione: ["Telefono valido", "Esigenza indicata", "Consenso marketing presente"],
    conversioneAttesa: "8–15% dei contatti raggiunti",
  },
  {
    key: "referral",
    nome: "Presenta un amico",
    categoria: "Fidelizzazione",
    reparto: "VENDITA",
    obiettivo: "Ottenere nuovi contatti caldi dai clienti soddisfatti.",
    pubblico: "Clienti dell'ultimo anno e i loro amici appassionati di mare.",
    promessa: "Presenta un amico: se diventa cliente, un premio per te e un vantaggio per lui.",
    leadMagnet: "Buono servizi per chi presenta + vantaggio di benvenuto per l'amico",
    cta: "Presenta un amico",
    steps: passi(
      ["LANDING", "Pagina referral", "Regole, premi, come funziona"],
      ["FORM", "Segnalazione", "Tuoi dati e dati dell'amico, con il suo consenso"],
      ["GRAZIE", "Conferma", "Messaggio pronto da inoltrare all'amico"],
      ["WHATSAPP", "Contatto all'amico", "Presentazione gentile, a nome di chi l'ha segnalato"],
    ),
    form: [
      { nome: "segnalatore", etichetta: "Il tuo nome", tipo: "testo", obbligatorio: true },
      { nome: "telefonoSegnalatore", etichetta: "Il tuo telefono", tipo: "telefono", obbligatorio: true },
      { nome: "nome", etichetta: "Nome dell'amico", tipo: "testo", obbligatorio: true },
      { nome: "telefono", etichetta: "Telefono dell'amico", tipo: "telefono", obbligatorio: true },
      { nome: "interesse", etichetta: "Cosa cerca l'amico?", tipo: "testo", obbligatorio: false },
      { nome: "consensoAmico", etichetta: "L'amico è d'accordo a essere contattato", tipo: "scelta", obbligatorio: true, opzioni: ["Sì, gliel'ho chiesto"] },
    ],
    emails: [{ giorno: 0, oggetto: "Grazie per averci presentato un amico", testo: "Ciao, grazie per la segnalazione. Contatteremo il tuo amico nei prossimi giorni e ti avviseremo quando il premio sarà disponibile." }],
    whatsapp: [{ momento: "Entro 2 giorni", testo: "Ciao {nome}, sono {consulente} di Faieta Marine. Un amico ci ha detto che stai pensando a una barca: posso esserti utile?" }],
    qualificazione: ["Telefono dell'amico valido", "Consenso dell'amico confermato", "Interesse indicato"],
    conversioneAttesa: "20–30% dei clienti che aprono l'invito",
  },
  {
    key: "salone",
    nome: "Campagna salone nautico",
    categoria: "Eventi",
    reparto: "VENDITA",
    obiettivo: "Fissare appuntamenti allo stand e raccogliere contatti durante il salone.",
    pubblico: "Acquirenti in valutazione, proprietari che cambiano barca, clienti Faieta Marine.",
    promessa: "Un appuntamento riservato allo stand, senza code e con le condizioni del salone.",
    leadMagnet: "Appuntamento riservato + valutazione dell'usato allo stand",
    cta: "Prenota il tuo appuntamento",
    steps: passi(
      ["LANDING", "Pagina salone", "Date, stand, modelli esposti, vantaggi dell'appuntamento"],
      ["FORM", "Giorno e fascia oraria", "Giorno, ora, modello, barca attuale"],
      ["GRAZIE", "Conferma", "Mappa dello stand e aggiunta al calendario"],
      ["WHATSAPP", "Promemoria", "Il giorno prima, con il nome del consulente"],
      ["EMAIL", "Dopo il salone", "Offerta scritta valida 30 giorni"],
    ),
    form: [F.nome, F.telefono, F.email, { nome: "giorno", etichetta: "Giorno della visita", tipo: "scelta", obbligatorio: true, opzioni: ["Da definire"] }, { nome: "interesse", etichetta: "Modello o tipo di barca che ti interessa", tipo: "testo", obbligatorio: false }, { nome: "barcaAttuale", etichetta: "Hai già una barca? Quale?", tipo: "testo", obbligatorio: false }, F.tempiVendita],
    emails: [
      { giorno: 0, oggetto: "Il tuo appuntamento al salone", testo: "Ciao {nome}, ti aspettiamo allo stand Faieta Marine. Con l'appuntamento hai un consulente dedicato, senza attese." },
      { giorno: 3, oggetto: "La tua offerta del salone, per iscritto", testo: "Ciao {nome}, come promesso ecco le condizioni del salone per il modello che hai visto, valide 30 giorni." },
    ],
    whatsapp: [{ momento: "Il giorno prima", testo: "Ciao {nome}, domani ti aspettiamo allo stand Faieta Marine all'orario fissato. Ti accoglierà {consulente}." }],
    qualificazione: ["Telefono valido", "Modello o tipo indicato", "Acquisto entro 12 mesi", "Appuntamento confermato"],
    conversioneAttesa: "10–18% delle visite",
  },
];

/** Modello consigliato per ogni tipo di campagna del generatore. */
export const TEMPLATE_PER_SCENARIO: Record<string, string> = {
  "prova-mare": "prova-mare",
  permuta: "permuta",
  noleggio: "preventivo-noleggio",
  manutenzione: "checklist-manutenzione",
  "open-day": "open-day",
  salone: "salone",
  "prima-barca": "guida-prima-barca",
  finanziamento: "calcolatore-rata",
  referral: "referral",
  riattivazione: "riattivazione",
  consulenza: "consulenza",
};

export function getTemplate(key: string) {
  return FUNNEL_TEMPLATES.find((t) => t.key === key) ?? null;
}

/** Sostituisce i segnaposto per l'anteprima dei messaggi. */
export function anteprimaTesto(t: string, v: { nome?: string; consulente?: string; data?: string } = {}) {
  return t
    .replaceAll("{nome}", v.nome ?? "Giulia")
    .replaceAll("{consulente}", v.consulente ?? "Marco")
    .replaceAll("{data}", v.data ?? "sabato");
}
