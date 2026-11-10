# Nautica Growth Engine

App per **produrre, pubblicare e misurare** le iniziative che portano nuovi lead a Faieta Marine.
Non è un CRM: il suo lavoro finisce quando il lead è qualificato e consegnato a **CRM Nautilus EVO**.

Stato: **Blocchi 1–5 e 7 completati**: fondamenta, ruoli, dashboard, raccolta e consegna lead a Nautilus EVO, generatore di campagne, libreria funnel, creatore di lead magnet, landing page online, eventi, calendario di produzione, asset creativi e report. Del Blocco 6 sono incluse solo le impostazioni necessarie alle landing (il webhook verso il CRM è rinviato a quando Nautilus EVO avrà un server).

---

## Avvio sul computer (gratuito, nessun account)

Serve **Node.js 20 o più recente** (https://nodejs.org, versione "LTS").

```bash
npm install           # scarica le librerie (solo la prima volta)
cp .env.example .env  # su Windows: copy .env.example .env
npm run setup         # crea il database e carica i dati demo
npm run dev           # avvia l'app
```

Apri http://localhost:3000 e accedi con uno di questi utenti demo (password `nautica2026`):

| Utente | Ruolo | Cosa può fare |
|---|---|---|
| marco@faietamarine.it | Admin | tutto |
| marketing@faietamarine.it | Marketing | campagne, contenuti, landing, eventi, consegna lead |
| contenuti@faietamarine.it | Content Creator | contenuti e funnel |
| eventi@faietamarine.it | Event Manager | eventi, vede i lead |

**Prima di usarla davvero:** in `.env` metti una `AUTH_SECRET` casuale (comando nel file) e cambia le password demo.

## Variabili d'ambiente

| Variabile | A cosa serve |
|---|---|
| `DATABASE_URL` | `file:./data/growth.db` (locale) oppure `libsql://…turso.io` (online) |
| `DATABASE_AUTH_TOKEN` | solo per Turso |
| `AUTH_SECRET` | chiave per firmare le sessioni, almeno 32 caratteri |
| `APP_URL` | indirizzo pubblico, per link e QR delle landing |
| `AI_PROVIDER` | `mock` (gratuito, testi da modelli pronti) o `anthropic` |
| `ANTHROPIC_API_KEY` | solo con `AI_PROVIDER=anthropic` |
| `AI_MODEL` | facoltativo, predefinito `claude-sonnet-5-5` |

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | avvio in sviluppo |
| `npm run build` / `npm start` | versione di produzione |
| `npm test` | test di punteggio, validazione, formato Nautilus EVO, generatore, funnel, lead magnet, landing, test A/B e stati |
| `npm run typecheck` | controllo dei tipi |
| `npm run db:reset` | cancella il database locale e ricarica i dati demo |

## Consegna dei lead a Nautilus EVO

Nautilus EVO oggi è una pagina condivisa senza server: **non può ricevere un webhook**.
Per questo la consegna avviene con un file:

1. In **Lead verso CRM** premi **Consegna N lead a Nautilus EVO**.
2. Si scarica `lead-nautilus-GE-….json` e i lead risultano consegnati (mai due volte).
3. Il file si importa in Nautilus EVO (pulsante da aggiungere al CRM, vedi sotto).

Il file contiene i lead già scritti come li salva il CRM:

- **Vendita e Noleggio** → elenco *Lead*: stato `Qualificato`, venditore `MARCO`, origine tra i 7 valori del CRM, prossimo contatto il giorno lavorativo dopo.
- **Service** → elenco *Lead Service*: stato `Richiesta ricevuta`, responsabile `DANIELE`.
- Nelle **note**: campagna, fonte e UTM, tempistica, punteggio, consensi privacy con data, risposte del form.
- Ogni lead ha id `ge_<uuid>`: reimportare lo stesso file non deve creare doppioni.

**Da fare nel CRM** (non modificato in questo blocco): pulsante "Importa lead dal Growth Engine" che legge il file, salta gli id già presenti, usa il riconoscimento cliente esistente (telefono ultime 9 cifre, email, nome) e aggancia l'anagrafica come "Potenziale".

Si può sempre scaricare anche un **CSV** (separatore `;`, si apre in Excel).

## Generatore di campagne (Blocco 2)

**Campagne → Nuova campagna**: scrivi l'obiettivo (es. "prove in mare per barche a vela usate"), scegli partenza e durata; budget e obiettivo lead sono facoltativi.
Il generatore riconosce il tipo di campagna (11 modelli: prova in mare, permuta, noleggio, manutenzione, open day, salone, prima barca, rata, referral, riattivazione, consulenza), il soggetto (tipo di barca, marca, nuovo/usato) e il reparto di Nautilus EVO.

Il piano contiene: KPI, pubblico, angolo, promessa, hook, pain point, desideri, obiezioni con risposta, offerta, CTA, funnel, campi del form, canali con budget, calendario, asset, metriche, criteri di qualificazione e avvertenze (stagionalità, privacy, tempi di preparazione).

**Come si calcolano i numeri** (sempre dal codice, mai dall'AI):

- Budget di default: base del modello per 60 giorni, proporzionata alla durata, minimo 200 €.
- Ogni canale riceve la sua quota; gli importi sono interi e sommano **esattamente** il budget.
- Lead stimati per canale = budget ÷ costo per lead di riferimento (Meta 30 €, Google 45 €, email 10 €, WhatsApp 8 €, evento 70 €, referral 60 €); canali senza spesa: 2 lead ogni 30 giorni.
- Lead qualificati = lead totali × tasso del modello (dal 40% al 75%). Se indichi un obiettivo più alto del 20%, il piano dice quanto budget servirebbe.
- I costi per lead sono stime prudenziali di partenza: vanno sostituiti con i dati reali dopo le prime settimane (`./lib/campaigns/scenarios.ts`).

**Stati**: Bozza → In revisione → Approvato → Pubblicato ⇄ In pausa → Concluso. Approvare e avviare richiedono il ruolo Marketing o Admin. Modificare la strategia di una campagna approvata la riporta in revisione; una campagna in corso accetta solo spesa, data di fine e obiettivo lead; una conclusa solo la spesa.

Dalla scheda: link con UTM per ogni canale, **Crea le attività** (il calendario diventa attività con scadenza), Duplica, Elimina (solo Admin, solo bozze senza lead).

## Libreria funnel (Blocco 3)

**Funnel → Modelli**: 12 percorsi pronti (prova in mare, permuta, preventivo noleggio, guida prima barca, checklist manutenzione, open day, quiz "quale barca", calcolatore rata, consulenza, riattivazione, referral, salone). Ognuno ha obiettivo, pubblico, promessa, lead magnet, pagine, campi del form, CTA, email di follow-up, messaggi WhatsApp e criteri di qualificazione.

- **Usa questo modello** crea una copia modificabile; se la colleghi a una campagna, prende promessa, CTA, pubblico e reparto della campagna.
- Nella scheda di una campagna senza funnel compare il **modello consigliato**, da creare con un clic.
- **Editor**: pagine, campi, email e WhatsApp si aggiungono, spostano ed eliminano. Nome e telefono restano sempre obbligatori (servono al CRM); il consenso privacy viene aggiunto in automatico; senza una pagina con form o quiz il funnel non si salva.
- **Stati** come le campagne. Il Content Creator può creare e inviare in revisione, non approvare né pubblicare. Un funnel pubblicato non si modifica: si crea una **nuova versione**, così i risultati restano legati a quella pubblicata.
- I campi del form usano gli stessi nomi della raccolta lead; i campi propri del funnel (es. "Quando preferisci?") arrivano come risposte e finiscono nelle note del CRM. Le fasce di budget diventano un valore numerico (es. 20.000–50.000 → 35.000 €) per punteggio e CRM.

Chi aggiorna da una versione precedente: `npm run db:push` aggiunge le nuove colonne senza perdere i dati.

## Creatore di lead magnet (Blocco 4)

**Lead magnet → Nuovo**: scegli il tipo (guida PDF, checklist, quiz, calcolatore, video-script, webinar, open day, prova in mare, consulenza, valutazione permuta, preventivo noleggio, buono), il tema e, se vuoi, la campagna.
La bozza contiene: titolo, sottotitolo, promessa, benefici, obiezioni, struttura del contenuto, testi della landing (headline, punti, FAQ, pulsante), 2–3 annunci Meta, titoli e descrizioni Google, email, WhatsApp, prompt per immagini e video, checklist di pubblicazione.

- **Limiti delle piattaforme** controllati dal codice: Google titoli 30 e descrizioni 90 caratteri (obbligatori); Meta testo 125, titolo 40, descrizione 30 (consigliati); oggetto email 60. Il generatore scarta i testi che sforano; l'editor mostra i contatori in rosso.
- **Pubblicazione bloccata** finché la checklist non è completa o un annuncio Google supera i limiti.
- **Scarica i testi**: tutto il lead magnet in un file Markdown da girare a grafici o agenzia.
- Con l'AI attiva, Claude riscrive i testi; quelli oltre i limiti vengono scartati e restano quelli del modello.
- Nella scheda campagna: lead magnet collegati e tipo consigliato.

## Landing page (Blocco 5)

**Landing page → Nuova**: si parte da un funnel, un lead magnet e/o una campagna; la prima bozza arriva con apertura, punti, form (campi del funnel), FAQ e invito finale.

- **Editor a blocchi** (apertura, punti, testo, immagine, video YouTube/Vimeo, form, testimonianze, FAQ, invito finale) con anteprima dal vivo su computer e telefono.
- **Bozza e versione online separate**: si lavora sulla bozza senza toccare la pagina pubblicata; "Pubblica le modifiche" aggiorna il sito.
- **Stati**: bozza → revisione → approvata → online ⇄ offline → conclusa. Pubblicare richiede il ruolo Marketing o Admin.
- **Regole di pubblicazione**: un solo form, con nome e telefono obbligatori; la pagina inizia con l'apertura; immagini solo da indirizzi https.
- **Indirizzo** `/l/<indirizzo>`: modificabile finché la pagina non è mai stata online.
- **Condivisione**: link da copiare, link con UTM per canale, QR code PNG/SVG (con UTM evento/qr).
- **Test A/B** su titolo, pulsante, immagine o offerta: metà dei visitatori vede la variante B (cookie tecnico di 30 giorni); il risultato è dichiarato solo con almeno 100 visite per variante e confidenza del 95%.
- **Lead dalla landing**: arrivano in "Lead verso CRM" con campagna, landing, variante, UTM della pagina, risposte con le etichette delle domande e versione dell'informativa accettata.
- **Privacy e cookie**: consenso privacy obbligatorio nel form, consenso marketing facoltativo, informativa pubblica su `/l/privacy`. Meta Pixel, Google Analytics e Tag Manager si attivano solo dopo "Accetta" nel banner (Accetta e Rifiuta hanno lo stesso peso); senza ID configurati il banner non compare.
- **Visite**: una per visitatore e sessione, contate solo sulle pagine online.

## Eventi, calendario, asset e report (Blocco 7)

**Eventi** (`/eventi`) — 9 tipi: open day, prova in mare, salone, webinar, evento clienti, presentazione nuovo modello, giornata manutenzione, evento charter, evento B2B. Ogni tipo porta: checklist logistica, copione per lo staff, inviti/promemoria/follow-up con date calcolate dall'evento e testi già compilati (link con UTM diversi per email e WhatsApp).
- Stati: Bozza → In revisione → Approvato (marketing/direzione) → Confermato ⇄ Sospeso → Svolto. Segnando «svolto», la pagina di iscrizione viene chiusa.
- «Crea la pagina di iscrizione»: landing con data, luogo e form (fascia oraria per prove in mare e giornate officina). Chi si iscrive diventa un iscritto dell'evento e un lead della campagna.
- Check-in degli iscritti, CSV degli iscritti, QR per totem e volantini.
- «Raccogli contatti sul posto»: pagina per il tablet dello staff (canale Evento), il form si svuota dopo ogni contatto.
- Numeri: iscritti, presenti (% sugli iscritti), raccolti sul posto, qualificati, costo per lead = spesa ÷ (iscritti + raccolti sul posto).
- L'invio automatico di email/WhatsApp richiede un servizio esterno (non ancora collegato): i testi si copiano o si mettono in calendario come attività.

**Calendario di produzione** (`/calendario`) — viste mese (su telefono diventa agenda), elenco, bacheca per stato, timeline per campagna (3 mesi), per persona. Nel mese compaiono anche eventi, partenze/fine campagne e scadenze delle creatività. Regole: un'attività che dipende da un'altra non può partire finché quella non è fatta; niente dipendenze circolari; non si riapre un'attività se chi dipende da lei è già partito.

**Asset** (`/asset`) — 13 tipi (headline, testi, immagini, video, carousel, email, landing, brochure, flyer, post social, script video, WhatsApp, materiali evento). Percorso Idea → Bozza → In revisione → Approvato → Pubblicato; approvare e pubblicare spetta a marketing/direzione. Cambiare il file di un asset in revisione o approvato crea la versione successiva e lo riporta in bozza; un asset pubblicato si cambia solo con «Nuova versione». Link al file solo https.

**Report** (`/report`) — periodi: questo mese, ultimi 30/90 giorni, anno solare, anno nautico (1° settembre – 31 agosto). Lead e qualificati per canale e campagna, costo per lead qualificato (spesa ÷ qualificati), conversione delle landing (lead ÷ visite), eventi, puntualità della produzione, andamento per settimana o mese, suggerimenti automatici con regole leggibili, esportazione CSV. La spesa di un evento collegato a una campagna è già nella spesa della campagna e non viene contata due volte.

## Impostazioni

Solo Admin: dati dell'azienda (piè di pagina e informativa), testo e versione dell'informativa privacy, ID di Meta Pixel, Google Analytics 4 e Tag Manager.
**L'informativa iniziale è una bozza da far verificare al consulente privacy prima di pubblicare.**

## Raccolta lead (per landing, quiz ed eventi)

`POST /api/lead` (JSON o form). Campi principali: `nome`, `telefono`, `consensoPrivacy` (obbligatorio),
`email`, `interesse`, `budget`, `tempistica`, `zona`, `messaggio`, `canale` (se manca si ricava da `utm_source`/`utm_medium`), `fonte`, `campagna` (= UTM della campagna), `consensoMarketing`.

Protezioni: validazione, consenso privacy obbligatorio, campo trappola anti-bot `sito`, massimo 10 invii al minuto per IP, dimensione massima 20 KB.

**Punteggio (0–100)**, qualificato da 40 in su:

| Voce | Vendita / Noleggio | Service |
|---|---|---|
| Email | 10 | 10 |
| Interesse indicato | 15 | 35 |
| Budget indicato | 20 | — |
| Tempistica | fino a 30 | fino a 30 |
| Zona | 5 | 5 |
| Messaggio ≥ 20 caratteri | 10 | 10 |
| Consenso marketing | 10 | 10 |
| Presente a un evento (check-in o raccolto sul posto) | 25 | 25 |

Il totale ha un tetto di 100. Il check-in di un iscritto ricalcola il punteggio: chi si presenta può diventare qualificato. I lead già consegnati o scartati non cambiano stato.

I lead sotto soglia restano in "Non qualificati": si possono qualificare o scartare a mano.

## Pubblicare online (gratis)

- **Netlify** (piano gratuito; Vercel gratuito non è consentito per uso commerciale) per l'app. Imposta `APP_URL` con l'indirizzo definitivo: serve per link e QR code.
- Il file SQLite **non** funziona online (il server non conserva i file): usa **Turso** (piano gratuito, stesso tipo di database) e imposta `DATABASE_URL` e `DATABASE_AUTH_TOKEN`, poi `npm run db:push && npm run db:seed`.

## Struttura

```
./
  app/            pagine (login, dashboard, campagne, lead…) e API (/api/lead, /api/export/…)
  components/     interfaccia (layout, badge, card…)
  features/       logica per area (dashboard, lead)
  lib/            accesso e ruoli, punteggio, validazione, formato Nautilus EVO
  db/             schema, connessione, dati demo
tests/            test automatici
```

## Roadmap

1. ✅ Fondamenta, ruoli, dashboard, raccolta e consegna lead
2. ✅ Generatore campagne
3. ✅ Libreria funnel (12 modelli)
4. ✅ Creatore lead magnet
5. ✅ Landing builder e pubblicazione
6. Webhook verso il CRM: rinviato (Nautilus EVO non ha ancora un server); impostazioni privacy e pixel già incluse
7. ✅ Eventi, calendario, asset, report
