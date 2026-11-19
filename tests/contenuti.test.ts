import { test } from "node:test";
import assert from "node:assert/strict";
import { blocchi, controllaPost, estratto, eventoFuturo, eventoSchema, minutiLettura, periodo, postSchema } from "../lib/vetrina/contenuti";

test("blocchi: paragrafi, sottotitoli ed elenchi", () => {
  const b = blocchi("Primo paragrafo\nseconda riga\n\n## Sottotitolo\nTesto dopo\n\n- uno\n- due");
  assert.deepEqual(b, [
    { tipo: "paragrafo", righe: ["Primo paragrafo", "seconda riga"] },
    { tipo: "titolo", righe: ["Sottotitolo"] },
    { tipo: "paragrafo", righe: ["Testo dopo"] },
    { tipo: "elenco", righe: ["uno", "due"] },
  ]);
});

test("estratto: taglia alla parola e toglie i segni", () => {
  assert.equal(estratto("## Titolo\nciao mondo"), "Titolo ciao mondo");
  const e = estratto("parola ".repeat(60), 30);
  assert.ok(e.length <= 30 && e.endsWith("…"));
});

test("minuti di lettura", () => {
  assert.equal(minutiLettura("a"), 1);
  assert.equal(minutiLettura("parola ".repeat(600)), 3);
});

test("periodo dell'evento", () => {
  assert.equal(periodo("2027-03-14"), "14 marzo 2027");
  assert.equal(periodo("2027-03-14", "2027-03-15"), "14 – 15 marzo 2027");
  assert.equal(periodo("2027-02-28", "2027-03-02"), "28 febbraio – 2 marzo 2027");
  assert.equal(periodo("2026-12-30", "2027-01-02"), "30 dicembre 2026 – 2 gennaio 2027");
});

test("evento futuro fino all'ultimo giorno compreso", () => {
  assert.equal(eventoFuturo({ data: "2026-11-19" }, "2026-11-19"), true);
  assert.equal(eventoFuturo({ data: "2026-11-18" }, "2026-11-19"), false);
  assert.equal(eventoFuturo({ data: "2026-11-17", dataFine: "2026-11-20" }, "2026-11-19"), true);
});

test("schema evento: date e posti", () => {
  const base = { tipo: "PROVE_IN_MARE", titolo: "Prove in mare Joker", data: "2027-04-10" };
  assert.equal(eventoSchema.safeParse({ ...base, posti: "" }).data?.posti, null);
  assert.equal(eventoSchema.safeParse({ ...base, posti: "20" }).data?.posti, 20);
  assert.equal(eventoSchema.safeParse({ ...base, dataFine: "2027-04-09" }).success, false);
  assert.equal(eventoSchema.safeParse({ ...base, foto: '["3f1c2a4e-1b2c-4d5e-8f90-1234567890ab"]' }).data?.foto, "3f1c2a4e-1b2c-4d5e-8f90-1234567890ab");
});

test("un articolo vuoto non si pubblica", () => {
  const p = postSchema.parse({ titolo: "Titolo valido", testo: "corto", stato: "PUBBLICATO" });
  assert.ok(controllaPost(p));
  assert.equal(controllaPost({ ...p, stato: "BOZZA" }), null);
  assert.equal(controllaPost({ ...p, testo: "x".repeat(300) }), null);
});

import { euro, offerta, controllaMezzo, mezzoSchema } from "../lib/vetrina/catalog";

test("euro con il separatore delle migliaia anche a 4 cifre", () => {
  assert.equal(euro(5600).replace(/\s/g, " "), "5.600 €");
  assert.equal(euro(68900).replace(/\s/g, " "), "68.900 €");
});

test("offerta: listino barrato solo se più alto, etichetta solo se non scaduta", () => {
  const oggi = "2026-11-19";
  assert.deepEqual(offerta({ prezzo: 68900, prezzoListino: 74500, promo: "Promo inverno", promoFine: "2027-01-31" }, oggi), { listino: 74500, risparmio: 5600, percentuale: 8, etichetta: "Promo inverno", scade: "2027-01-31" });
  assert.equal(offerta({ prezzo: 70000, prezzoListino: 69000, promo: "" }, oggi), null);
  assert.equal(offerta({ prezzo: 70000, prezzoListino: null, promo: "Promo estate", promoFine: "2026-09-30" }, oggi), null);
  assert.equal(offerta({ prezzo: 70000, prezzoListino: 75000, promo: "", stato: "VENDUTO" }, oggi), null);
  assert.equal(offerta({ prezzo: 70000, prezzoListino: 75000, promo: "Promo estate", promoFine: "2026-09-30" }, oggi)?.etichetta, "");
});

test("mezzo: il listino deve superare il prezzo", () => {
  const base = { marca: "yamaha", modello: "F150", categoria: "FUORIBORDO", condizione: "PRONTA_CONSEGNA", stato: "BOZZA", foto: "[]", dotazioni: "" };
  const ok = mezzoSchema.parse({ ...base, prezzo: "14200", prezzoListino: "15650" });
  assert.equal(controllaMezzo(ok), null);
  assert.ok(controllaMezzo(mezzoSchema.parse({ ...base, prezzo: "14200", prezzoListino: "14000" })));
  assert.ok(controllaMezzo(mezzoSchema.parse({ ...base, prezzoListino: "15650" })));
});
