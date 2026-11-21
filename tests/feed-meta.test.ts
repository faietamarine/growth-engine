import { test } from "node:test";
import assert from "node:assert/strict";
import { csvMeta, motivoEsclusione, rigaMeta } from "../lib/vetrina/feed-meta";
import type { Vehicle } from "../db/schema";

const base = {
  id: "11111111-1111-4111-8111-111111111111", marca: "joker-boat", modello: "Clubman 26", categoria: "GOMMONE", condizione: "PRONTA_CONSEGNA", stato: "PUBBLICATO",
  anno: 2026, prezzo: 68900, prezzoListino: 74500, promo: "Promo inverno", promoFine: "2027-01-31", motore: "Yamaha F300", descrizione: "Gommone, \"pronto\" in piazzale",
  foto: ["a", "b"], dotazioni: [], brochure: "", inEvidenza: false, incluso: "", finanziabile: true, lunghezza: null, larghezza: null, posti: null, potenza: null, ore: null,
  createdAt: new Date(), updatedAt: new Date(),
} as unknown as Vehicle;

test("chi entra nel catalogo Meta", () => {
  assert.equal(motivoEsclusione(base), null);
  assert.equal(motivoEsclusione({ ...base, condizione: "DA_ORDINARE" }), "Modello da ordinare");
  assert.ok(motivoEsclusione({ ...base, prezzo: null }));
  assert.ok(motivoEsclusione({ ...base, foto: [] }));
  assert.equal(motivoEsclusione({ ...base, stato: "VENDUTO" }), "Venduto");
});

test("riga: listino come prezzo pieno, prezzo Faieta come scontato, link tracciato", () => {
  const r = rigaMeta(base, "https://faietamarine.netlify.app", "2026-11-20");
  assert.equal(r.price, "74500.00 EUR");
  assert.equal(r.sale_price, "68900.00 EUR");
  assert.equal(r.condition, "new");
  assert.match(r.link, /utm_source=whatsapp/);
  assert.equal(r.image_link, "https://faietamarine.netlify.app/media/a");
  assert.equal(r.additional_image_link, "https://faietamarine.netlify.app/media/b");
  const senzaPromo = rigaMeta({ ...base, prezzoListino: null, promo: "" }, "https://x.it", "2026-11-20");
  assert.equal(senzaPromo.price, "68900.00 EUR");
  assert.equal(senzaPromo.sale_price, "");
});

test("CSV: virgolette e virgole protette, esclusi fuori", () => {
  const { testo, inclusi } = csvMeta([base, { ...base, id: "2", condizione: "DA_ORDINARE" } as Vehicle], "https://x.it", "2026-11-20");
  assert.equal(inclusi, 1);
  const righe = testo.split("\n");
  assert.equal(righe.length, 2);
  assert.ok(righe[1].includes('""pronto""'));
});

import { righeAggiorna, rigaElenco, leggiCsv, abbinaMezzo } from "../lib/vetrina/strumenti";
const mezzi = [
  { id: "aaaaaaaa-1111-4111-8111-111111111111", marca: "joker-boat", modello: "Clubman 26" },
  { id: "bbbbbbbb-2222-4222-8222-222222222222", marca: "joker-boat", modello: "Clubman 26" },
  { id: "cccccccc-3333-4333-8333-333333333333", marca: "capelli", modello: "Tempest 600" },
];

test("aggiorna da file: codice, nome univoco, celle vuote non toccate, trattino svuota", () => {
  const csv = leggiCsv('codice;marca;modello;prezzo;listino;promo fino al;cosa comprende;descrizione;stato\naaaaaaaa;;;68.900;74500;31/01/2027;Motore F300 | IVA inclusa;;Online\n;Capelli;Tempest 600;;-;;;"Nuova; bella";\n;Joker Boat;Clubman 26;1;;;;;\n');
  const r = righeAggiorna(csv, mezzi);
  assert.deepEqual(r[0].campi, { prezzo: 68900, prezzoListino: 74500, incluso: "Motore F300\nIVA inclusa", promoFine: "2027-01-31", stato: "PUBBLICATO" });
  assert.equal(r[0].id, mezzi[0].id);
  assert.deepEqual(r[1].campi, { prezzoListino: null, descrizione: "Nuova; bella" });
  assert.match(r[2].errore ?? "", /stesso nome/);
});

test("elenco scaricabile: codice di 8 cifre e testi protetti", () => {
  const riga = rigaElenco({ id: mezzi[2].id, marca: "capelli", modello: "Tempest 600", condizione: "PRONTA_CONSEGNA", stato: "PUBBLICATO", anno: 2026, prezzo: 39900, prezzoListino: null, promo: "", promoFine: "2027-01-31", motore: "", incluso: "A\nB", descrizione: 'Dice "ciao"; ok' });
  assert.ok(riga.startsWith("cccccccc;Capelli;Tempest 600;"));
  assert.ok(riga.includes("31/01/2027"));
  assert.ok(riga.includes("A | B"));
  assert.ok(riga.endsWith('"Dice ""ciao""; ok"'));
});

test("foto: il codice nel nome del file evita l'ambiguità", () => {
  assert.deepEqual(abbinaMezzo("bbbbbbbb-3.jpg", mezzi), { id: mezzi[1].id, ordine: 3 });
  assert.deepEqual(abbinaMezzo("bbbbbbbb.jpg", mezzi), { id: mezzi[1].id, ordine: 1 });
});
