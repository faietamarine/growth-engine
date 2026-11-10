import { test } from "node:test";
import assert from "node:assert/strict";
import { TIPI_EVENTO, compila, dataLunga, tipoOrDefault } from "../src/lib/events/catalog";
import { blocchiIscrizione, eventoSchema, metricheEvento, programmaComunicazioni, campiIscrizione, fasciaDi } from "../src/lib/events/logic";
import { problemiPubblicazione, blocchiSchema } from "../src/lib/landing/blocks";
import { bloccoDipendenza, creaCiclo, grigliaMese, meseVicino, meseValido, barra, scadenzaIncoerente } from "../src/lib/calendar/logic";
import { TIPI_ASSET, assetSchema, effettoModifica, puoPassare, transizioniAsset } from "../src/lib/assets/catalog";
import { periodo, suggerimenti, settimanaDi, chiaviPeriodo, percento, costoPer } from "../src/lib/report/logic";
import { allowedTransitions } from "../src/lib/campaigns/status";

test("eventi: 9 tipi completi, chiavi uniche, testi senza segnaposto sconosciuti", () => {
  assert.equal(TIPI_EVENTO.length, 9);
  assert.equal(new Set(TIPI_EVENTO.map((t) => t.key)).size, 9);
  for (const t of TIPI_EVENTO) {
    assert.ok(t.checklist.length >= 5, t.key);
    assert.ok(t.copione.length >= 3, t.key);
    assert.ok(t.messaggi.some((m) => m.giorni < 0), `${t.key}: manca un invito/promemoria`);
    assert.ok(t.messaggi.some((m) => m.giorni > 0), `${t.key}: manca il follow-up`);
    for (const m of t.messaggi) {
      const out = compila(m.testo, { nome: "Open Day", data: "2027-04-18", ora: "10:00", luogo: "Marina di Pescara", link: "https://x.it/l/a" });
      assert.doesNotMatch(out, /\{[a-z]+\}/, `${t.key}: segnaposto non sostituito`);
      if (m.canale === "WHATSAPP") assert.ok(out.length <= 500, `${t.key}: WhatsApp oltre 500 caratteri`);
    }
  }
  assert.equal(tipoOrDefault("sconosciuto").key, "open-day");
});

test("date in italiano lette come calendario (nessuno slittamento di fuso)", () => {
  assert.equal(dataLunga("2027-04-18"), "domenica 18 aprile");
  assert.equal(dataLunga("2026-11-09"), "lunedì 9 novembre");
  assert.equal(dataLunga("2027-01-01"), "venerdì 1 gennaio");
});

test("validazione evento: orari coerenti, numeri non negativi", () => {
  const base = { name: "Open Day", type: "open-day", campaignId: "", date: "2027-04-18", time: "10:00", endTime: "18:00", venue: "Marina", capacity: "200", budget: "3200" };
  const ok = eventoSchema.safeParse(base);
  assert.ok(ok.success);
  assert.equal(ok.data!.capacity, 200);
  assert.equal(ok.data!.campaignId, null);
  assert.ok(!eventoSchema.safeParse({ ...base, endTime: "09:00" }).success);
  assert.ok(!eventoSchema.safeParse({ ...base, time: "25:00" }).success);
  assert.ok(!eventoSchema.safeParse({ ...base, budget: "-1" }).success);
  assert.ok(!eventoSchema.safeParse({ ...base, capacity: "10.5" }).success);
});

test("numeri evento controllati a mano", () => {
  // 40 iscritti, 26 presenti, 9 raccolti sul posto, 20 qualificati, spesa 1.225 €, capienza 50.
  const m = metricheEvento({ iscritti: 40, presenti: 26, sulPosto: 9, qualificati: 20, consegnati: 12, capienza: 50, spesa: 1225 });
  assert.equal(m.leadTotali, 49);
  assert.equal(m.partecipanti, 35);
  assert.equal(m.tassoPresenza, 65); // 26/40
  assert.equal(m.riempimento, 80); // 40/50
  assert.equal(m.postiLiberi, 10);
  assert.equal(m.costoPerLead, 25); // 1225/49
  assert.equal(m.costoPerQualificato, 61.25); // 1225/20
  assert.equal(m.costoPerPartecipante, 35); // 1225/35
  // Nessun dato: nessuna divisione per zero.
  const z = metricheEvento({ iscritti: 0, presenti: 0, sulPosto: 0, qualificati: 0, consegnati: 0, capienza: 0, spesa: 500 });
  assert.equal(z.tassoPresenza, null);
  assert.equal(z.costoPerLead, null);
  assert.equal(z.postiLiberi, null);
  // Più iscritti della capienza: posti liberi a zero, non negativi.
  assert.equal(metricheEvento({ iscritti: 60, presenti: 0, sulPosto: 0, qualificati: 0, consegnati: 0, capienza: 50, spesa: 0 }).postiLiberi, 0);
});

test("programma comunicazioni: date relative all'evento, in ordine, passate segnate", () => {
  const tipo = tipoOrDefault("open-day");
  const p = programmaComunicazioni(tipo, { nome: "Open Day", date: "2027-04-18", time: "10:00", venue: "Marina" }, "https://x.it/l/a", "2027-04-10");
  assert.deepEqual(p.map((c) => c.quando), ["2027-04-04", "2027-04-11", "2027-04-17", "2027-04-19", "2027-04-21"]);
  assert.deepEqual(p.map((c) => c.passata), [true, false, false, false, false]);
  assert.match(p[0].testoCompilato, /https:\/\/x\.it\/l\/a/);
  // Attraversa il cambio di mese.
  const q = programmaComunicazioni(tipo, { nome: "X", date: "2027-03-02", time: "10:00", venue: "M" }, undefined, "2027-01-01");
  assert.equal(q[0].quando, "2027-02-16");
  assert.match(q[0].testoCompilato, /\[link di iscrizione\]/);
});

test("pagina di iscrizione: pubblicabile, form con nome e telefono, fascia oraria per le prove", () => {
  for (const t of TIPI_EVENTO) {
    const b = blocchiIscrizione({ name: `Evento ${t.nome}`, type: t.key, date: "2027-04-18", time: "10:00", endTime: "18:00", venue: "Marina", objective: "" });
    assert.deepEqual(problemiPubblicazione(b), [], t.key);
    assert.ok(blocchiSchema.safeParse(b).success, t.key);
  }
  assert.ok(campiIscrizione(tipoOrDefault("prova-mare")).some((c) => c.nome === "fascia" && c.obbligatorio));
  assert.ok(!campiIscrizione(tipoOrDefault("open-day")).some((c) => c.nome === "fascia"));
  assert.ok(campiIscrizione(tipoOrDefault("evento-b2b")).some((c) => c.nome === "azienda"));
  assert.equal(fasciaDi({ "Fascia oraria preferita": "9:00–10:30" }), "9:00–10:30");
});

test("stati evento: l'organizzatore conferma e chiude, l'approvazione resta a marketing", () => {
  const ev = (s: Parameters<typeof allowedTransitions>[0], r: Parameters<typeof allowedTransitions>[1]) => allowedTransitions(s, r, "evento").map((t) => t.to);
  assert.deepEqual(ev("BOZZA", "EVENT"), ["REVISIONE"]);
  assert.deepEqual(ev("REVISIONE", "EVENT"), ["BOZZA"]);
  assert.deepEqual(ev("REVISIONE", "MARKETING"), ["APPROVATO", "BOZZA"]);
  assert.deepEqual(ev("APPROVATO", "EVENT"), ["PUBBLICATO", "BOZZA"]);
  assert.deepEqual(ev("PUBBLICATO", "EVENT"), ["PAUSA", "CONCLUSO"]);
  assert.deepEqual(ev("BOZZA", "CONTENT"), []);
  assert.equal(allowedTransitions("APPROVATO", "EVENT", "evento")[0].label, "Conferma l'evento");
  // Le campagne non cambiano.
  assert.deepEqual(allowedTransitions("APPROVATO", "EVENT", "campagna"), []);
});

test("dipendenze: si parte solo quando la precedente è fatta; niente giri chiusi", () => {
  const dip = { id: "a", title: "Foto", status: "IN_CORSO" as const, dueDate: "2027-01-10", dependsOnId: null };
  assert.match(bloccoDipendenza("IN_CORSO", dip)!, /Foto/);
  assert.match(bloccoDipendenza("FATTO", dip)!, /Foto/);
  assert.equal(bloccoDipendenza("DA_FARE", dip), null);
  assert.equal(bloccoDipendenza("FATTO", { ...dip, status: "FATTO" }), null);
  assert.equal(bloccoDipendenza("FATTO", null), null);
  const tutte = [
    { id: "a", dependsOnId: null },
    { id: "b", dependsOnId: "a" },
    { id: "c", dependsOnId: "b" },
  ];
  assert.equal(creaCiclo("a", "c", tutte), true); // a → c → b → a
  assert.equal(creaCiclo("a", "a", tutte), true);
  assert.equal(creaCiclo("c", "a", tutte), false);
  assert.equal(creaCiclo(null, "c", tutte), false); // attività nuova
  assert.equal(scadenzaIncoerente("2027-01-05", dip), true);
  assert.equal(scadenzaIncoerente("2027-01-12", dip), false);
});

test("calendario: griglia lunedì-domenica, mesi vicini, barre della timeline", () => {
  const g = grigliaMese("2026-11"); // 1/11/2026 è domenica
  assert.equal(g[0][0].data, "2026-10-26");
  assert.equal(g[0][6].data, "2026-11-01");
  assert.equal(g.at(-1)!.at(-1)!.data, "2026-12-06");
  assert.ok(g.every((w) => w.length === 7));
  assert.equal(g.flat().filter((d) => d.nelMese).length, 30);
  const feb = grigliaMese("2027-02"); // 1/2/2027 lunedì, 28/2 domenica: 4 settimane esatte
  assert.equal(feb.length, 4);
  assert.equal(grigliaMese("2028-02").flat().filter((d) => d.nelMese).length, 29); // bisestile
  assert.equal(meseVicino("2026-12", 1), "2027-01");
  assert.equal(meseVicino("2027-01", -1), "2026-12");
  assert.equal(meseValido("2026-13", "2026-11-09"), "2026-11");
  assert.equal(meseValido("2027-03", "2026-11-09"), "2027-03");
  const b = barra("2026-11-05", "2026-11-14", "2026-11-01", "2026-11-30")!;
  assert.ok(Math.abs(b.left - (4 / 30) * 100) < 1e-9);
  assert.ok(Math.abs(b.width - (10 / 30) * 100) < 1e-9);
  assert.equal(barra("2026-12-01", "2026-12-05", "2026-11-01", "2026-11-30"), null);
  const tagliata = barra("2026-10-20", "2026-11-03", "2026-11-01", "2026-11-30")!;
  assert.equal(tagliata.left, 0);
  assert.ok(Math.abs(tagliata.width - 10) < 1e-9); // 3 giorni su 30
});

test("asset: 13 tipi, link solo https, percorso e versioni", () => {
  assert.equal(TIPI_ASSET.length, 13);
  const base = { title: "Carosello", type: "Carousel", campaignId: "", authorId: "", dueDate: "", fileUrl: "" };
  assert.ok(assetSchema.safeParse(base).success);
  assert.ok(!assetSchema.safeParse({ ...base, fileUrl: "http://drive.google.com/x" }).success);
  assert.ok(!assetSchema.safeParse({ ...base, fileUrl: "javascript:alert(1)" }).success);
  assert.ok(!assetSchema.safeParse({ ...base, type: "Altro" }).success);
  assert.equal(assetSchema.parse({ ...base, fileUrl: "https://drive.google.com/x" }).fileUrl, "https://drive.google.com/x");
  // Chi crea contenuti non approva.
  assert.deepEqual(transizioniAsset("REVISIONE", "CONTENT").map((t) => t.to), ["BOZZA"]);
  assert.ok(puoPassare("REVISIONE", "APPROVATO", "MARKETING"));
  assert.ok(!puoPassare("IDEA", "PUBBLICATO", "ADMIN")); // niente salti
  assert.deepEqual(transizioniAsset("PUBBLICATO", "ADMIN"), []);
  // Nuovo file su un asset in revisione: versione +1 e torna in bozza.
  assert.deepEqual({ ...effettoModifica({ status: "REVISIONE", fileUrl: "https://a", version: 2 }, "https://b"), messaggio: "" }, { version: 3, status: "BOZZA", messaggio: "" });
  assert.equal(effettoModifica({ status: "BOZZA", fileUrl: "https://a", version: 1 }, "https://b").version, 1);
  assert.equal(effettoModifica({ status: "APPROVATO", fileUrl: "https://a", version: 1 }, "https://a").status, "APPROVATO");
});

test("periodi del report: mese, ultimi giorni, anno solare e anno nautico (1 set – 31 ago)", () => {
  assert.deepEqual([periodo("mese", "2026-11-09").da, periodo("mese", "2026-11-09").a], ["2026-11-01", "2026-11-30"]);
  assert.equal(periodo("mese", "2028-02-10").a, "2028-02-29");
  assert.deepEqual([periodo("30", "2026-11-09").da, periodo("30", "2026-11-09").a], ["2026-10-11", "2026-11-09"]);
  assert.equal(periodo("90", "2026-11-09").da, "2026-08-12");
  assert.deepEqual([periodo("anno", "2026-11-09").da, periodo("anno", "2026-11-09").a], ["2026-01-01", "2026-12-31"]);
  const n1 = periodo("nautico", "2026-11-09");
  assert.deepEqual([n1.da, n1.a, n1.etichetta], ["2026-09-01", "2027-08-31", "Anno nautico 2026/27"]);
  const n2 = periodo("nautico", "2027-08-31");
  assert.deepEqual([n2.da, n2.a], ["2026-09-01", "2027-08-31"]);
  const n3 = periodo("nautico", "2027-09-01");
  assert.deepEqual([n3.da, n3.a], ["2027-09-01", "2028-08-31"]);
  assert.equal(periodo("boh", "2026-11-09").key, "mese");
});

test("andamento: settimane da lunedì e mesi dell'anno nautico", () => {
  assert.equal(settimanaDi("2026-11-09"), "2026-11-09"); // lunedì
  assert.equal(settimanaDi("2026-11-15"), "2026-11-09"); // domenica
  assert.equal(settimanaDi("2026-11-01"), "2026-10-26");
  const mesi = chiaviPeriodo("2026-09-01", "2027-08-31", true);
  assert.equal(mesi.length, 12);
  assert.deepEqual([mesi[0], mesi[3], mesi[4], mesi[11]], ["2026-09", "2026-12", "2027-01", "2027-08"]);
  const sett = chiaviPeriodo("2026-11-01", "2026-11-30", false);
  assert.deepEqual([sett[0], sett.at(-1)], ["2026-10-26", "2026-11-30"]);
  assert.equal(percento(1, 3), 33.3);
  assert.equal(percento(1, 0), null);
  assert.equal(costoPer(1000, 3), 333.33);
});

test("suggerimenti: regole leggibili, priorità in alto", () => {
  const base = { landing: [], campagne: [], canali: [], leadTotali: 0, nonQualificati: 0, inCoda: 0, attivitaInRitardo: 0, eventi: [] };
  assert.equal(suggerimenti(base)[0].titolo, "Nessun problema evidente nel periodo");
  const s = suggerimenti({
    ...base,
    landing: [
      { titolo: "Permuta", visite: 980, lead: 10, abAttivo: false }, // 1,0% → suggerito A/B
      { titolo: "Piccola", visite: 120, lead: 1, abAttivo: false }, // poche visite → niente
    ],
    campagne: [
      { nome: "Joker", spesa: 2000, qualificati: 10, cplObiettivo: 100, attiva: true }, // 200 > 130 → avviso
      { nome: "Ok", spesa: 1000, qualificati: 10, cplObiettivo: 100, attiva: true }, // 100 → niente
      { nome: "Zero", spesa: 500, qualificati: 0, cplObiettivo: 50, attiva: true }, // speso senza qualificati
    ],
    canali: [
      { canale: "GOOGLE", lead: 10, qualificati: 8 },
      { canale: "META", lead: 20, qualificati: 6 },
    ],
    leadTotali: 30,
    nonQualificati: 16,
    inCoda: 3,
    attivitaInRitardo: 1,
  });
  const titoli = s.map((x) => x.titolo).join(" | ");
  assert.match(titoli, /«Permuta» converte poco: 1% su 980 visite/);
  assert.doesNotMatch(titoli, /Piccola/);
  assert.match(titoli, /«Joker»: 200\s€ per lead qualificato/);
  assert.doesNotMatch(titoli, /«Ok»/);
  assert.match(titoli, /«Zero» ha speso 500\s€/);
  assert.match(titoli, /Google Ads porta lead migliori di Meta Ads/);
  assert.match(titoli, /Più di metà dei lead/);
  assert.match(titoli, /3 lead qualificati aspettano/);
  assert.match(titoli, /1 attività in ritardo/);
  // Prima le priorità alte.
  assert.equal(s[0].livello, "alta");
  assert.ok(s.findIndex((x) => x.livello === "info") > s.findLastIndex((x) => x.livello === "alta"));
});

import { scoreLead, scoreDaLead } from "../src/lib/leads/score";
test("presenza all'evento: +25 punti, tetto a 100", () => {
  // Iscritto con sola email e interesse: 25 → non qualificato; se si presenta: 50 → qualificato.
  const base = { reparto: "VENDITA" as const, email: "a@b.it", interesse: "Barca usata" };
  assert.equal(scoreLead(base).score, 25);
  assert.equal(scoreLead({ ...base, presenteEvento: true }).score, 50);
  // Solo telefono, presente: 25 → resta da completare.
  assert.equal(scoreLead({ reparto: "VENDITA", presenteEvento: true }).score, 25);
  // Tutto compilato + presenza: 100 + 25 → 100.
  assert.equal(scoreLead({ ...base, budget: 50000, tempistica: "Entro 3 mesi", zona: "Pescara", messaggio: "Vorrei vederla sabato mattina in marina", consensoMarketing: true, presenteEvento: true }).score, 100);
  const l = { reparto: "VENDITA" as const, email: "a@b.it", interest: "Barca usata", budget: null, timeframe: "", zone: "", message: "", consents: { marketing: false } };
  assert.equal(scoreDaLead(l, true), 50);
  assert.equal(scoreDaLead(l, false), 25);
});
