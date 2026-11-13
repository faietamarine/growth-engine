import { test } from "node:test";
import assert from "node:assert/strict";
import { controllaMezzo, datiVitali, euro, mezzoSchema } from "@/lib/vetrina/catalog";
import { DOMANDE, ordinaPerProfilo, profiloQuiz } from "@/lib/vetrina/quiz";

const base = { marca: "joker-boat", modello: "Clubman 24", categoria: "GOMMONE", condizione: "PRONTA_CONSEGNA", stato: "BOZZA" };
const FOTO = "123e4567-e89b-42d3-a456-426614174000";

test("mezzo: numeri in formato italiano e campi vuoti", () => {
  const p = mezzoSchema.parse({ ...base, prezzo: "39.000", lunghezza: "7,5", anno: "", dotazioni: "GPS\n\n  Tendalino \n", foto: JSON.stringify([FOTO]) });
  assert.equal(p.prezzo, 39000);
  assert.equal(p.lunghezza, 7.5);
  assert.equal(p.anno, undefined);
  assert.deepEqual(p.dotazioni, ["GPS", "Tendalino"]);
  assert.deepEqual(p.foto, [FOTO]);
});

test("mezzo: marchio o categoria inventati sono rifiutati", () => {
  assert.equal(mezzoSchema.safeParse({ ...base, marca: "pippo" }).success, false);
  assert.equal(mezzoSchema.safeParse({ ...base, categoria: "ALIANTE" }).success, false);
  assert.equal(mezzoSchema.safeParse({ ...base, foto: JSON.stringify(["non-un-id"]) }).success, false);
});

test("mezzo: l'usato vuole l'anno, online vuole almeno una foto", () => {
  assert.match(controllaMezzo(mezzoSchema.parse({ ...base, condizione: "USATO" }))!, /anno/);
  assert.match(controllaMezzo(mezzoSchema.parse({ ...base, stato: "PUBBLICATO" }))!, /foto/);
  assert.equal(controllaMezzo(mezzoSchema.parse({ ...base, stato: "PUBBLICATO", foto: JSON.stringify([FOTO]) })), null);
  assert.equal(controllaMezzo(mezzoSchema.parse({ ...base, condizione: "USATO", anno: "2019" })), null);
  // i modelli a catalogo possono andare online senza foto
  assert.equal(controllaMezzo(mezzoSchema.parse({ ...base, condizione: "DA_ORDINARE", stato: "PUBBLICATO" })), null);
});

test("catalogo modelli: categorie coerenti con le aree dei marchi, niente doppioni", async () => {
  const { MODELLI_CATALOGO } = await import("../lib/brands/modelli");
  const { MARCHI } = await import("../lib/brands/catalog");
  const viste = new Set<string>();
  for (const x of MODELLI_CATALOGO) {
    const marchio = MARCHI.find((mm) => mm.slug === x.marca);
    assert.ok(marchio, `marchio sconosciuto: ${x.marca}`);
    if (marchio.aree) assert.ok(marchio.aree.some((a) => a.categorie.includes(x.categoria)), `${x.marca} ${x.modello}: categoria fuori dalle aree`);
    const k = `${x.marca}|${x.modello.toLowerCase()}`;
    assert.ok(!viste.has(k), `doppione: ${k}`);
    viste.add(k);
  }
});

test("prezzo e dati vitali", () => {
  assert.equal(euro(null), "Su richiesta");
  assert.match(euro(39000), /39\.000/);
  assert.deepEqual(datiVitali({ anno: 2020, lunghezza: 7.5, motore: "", ore: 0, posti: null }).map((d) => d.k), ["Anno", "Lunghezza", "Ore motore"]);
});

test("categorie: niente barche a vela, e le macro aree dei marchi puntano a categorie esistenti", async () => {
  const { CATEGORIE } = await import("@/lib/vetrina/catalog");
  const { MARCHI } = await import("@/lib/brands/catalog");
  const ids = CATEGORIE.map((c) => c.id as string);
  assert.ok(!ids.includes("VELA"));
  for (const m of MARCHI) for (const a of m.aree ?? []) for (const c of a.categorie) assert.ok(ids.includes(c), `${m.slug}/${a.id}: ${c}`);
  assert.deepEqual(MARCHI.find((m) => m.slug === "capelli")!.aree!.map((a) => a.id), ["barche", "gommoni"]);
  assert.deepEqual(MARCHI.find((m) => m.slug === "yamaha")!.aree!.map((a) => a.id), ["fuoribordo", "moto-d-acqua"]);
});

test("quiz: il profilo premia le categorie giuste e le tempistiche del punteggio lead", () => {
  const p = profiloQuiz({ uso: "Crociera", persone: "Più di cinque", quando: "Subito, pronta consegna" });
  assert.equal(p.categorie[0], "CABINATO");
  assert.ok(!(p.categorie as string[]).includes("VELA"));
  assert.equal(p.tempistica, "Entro 3 mesi");
  assert.deepEqual(p.condizioni, ["PRONTA_CONSEGNA", "USATO"]);
  // Ogni tempistica del quiz deve essere una voce che il punteggio dei lead conosce.
  const note = ["Entro 3 mesi", "Entro 6 mesi", "Entro 12 mesi", "Sto solo guardando"];
  for (const o of DOMANDE[2].opzioni) assert.ok(note.includes(o.tempistica!));
});

test("quiz: i mezzi si ordinano per vicinanza al profilo", () => {
  const mezzi = [
    { id: "a", categoria: "FUORIBORDO", condizione: "USATO", inEvidenza: false },
    { id: "b", categoria: "CABINATO", condizione: "PRONTA_CONSEGNA", inEvidenza: false },
    { id: "c", categoria: "CABINATO", condizione: "DA_ORDINARE", inEvidenza: false },
  ];
  const ord = ordinaPerProfilo(mezzi, profiloQuiz({ uso: "Pesca", persone: "Da tre a cinque", quando: "Subito, pronta consegna" }));
  assert.equal(ord[0].id, "b");
  assert.equal(ord.at(-1)!.id, "a");
});

import { inCorso, oggiRoma, promoSchema } from "@/lib/vetrina/promo";

test("avviso: date incluse, spento e scaduto non compaiono", () => {
  const p = { attivo: true, inizio: "2026-11-27", fine: "2026-11-30" };
  assert.equal(inCorso(p, "2026-11-26"), false);
  assert.equal(inCorso(p, "2026-11-27"), true);
  assert.equal(inCorso(p, "2026-11-30"), true);
  assert.equal(inCorso(p, "2026-12-01"), false);
  assert.equal(inCorso({ ...p, attivo: false }, "2026-11-28"), false);
});

test("avviso: oggi si calcola sul giorno italiano, non UTC", () => {
  assert.equal(oggiRoma(new Date("2026-11-27T23:30:00Z")), "2026-11-28");
  assert.equal(oggiRoma(new Date("2026-06-30T22:30:00Z")), "2026-07-01");
});

test("avviso: validazione di date e pulsante", () => {
  const base = { titolo: "Black Friday", inizio: "2026-11-27", fine: "2026-11-30" };
  assert.equal(promoSchema.safeParse(base).success, true);
  assert.equal(promoSchema.safeParse({ ...base, fine: "2026-11-01" }).success, false);
  assert.equal(promoSchema.safeParse({ ...base, ctaTipo: "MEZZO" }).success, false);
  assert.equal(promoSchema.safeParse({ ...base, titolo: "x".repeat(71) }).success, false);
});

test("prezzi di gruppo: percentuale e importo, arrotondati ai 10 €, mai sotto zero", async () => {
  const { nuovoPrezzo } = await import("../lib/vetrina/strumenti");
  assert.equal(nuovoPrezzo(50000, { tipo: "PERCENTUALE", valore: 3 }), 51500);
  assert.equal(nuovoPrezzo(48500, { tipo: "PERCENTUALE", valore: -2.5 }), 47290);
  assert.equal(nuovoPrezzo(10000, { tipo: "IMPORTO", valore: -500 }), 9500);
  assert.equal(nuovoPrezzo(100, { tipo: "IMPORTO", valore: -5000 }), 0);
});

test("import CSV: separatore ; o , , virgolette e righe con errore", async () => {
  const { leggiCsv, righeImport } = await import("../lib/vetrina/strumenti");
  const csv = leggiCsv('marca;modello;categoria;condizione;prezzo;descrizione\nCapelli;Tempest 600;Gommone;Pronta consegna;48.500;"Con ""tendalino""; nuovo"\nXyz;A;Open;Usato;1;\nJeanneau;Merry Fisher 695;Cabinato;Modelli a catalogo;;\n');
  assert.equal(csv.length, 4);
  const r = righeImport(csv);
  assert.equal(r[0].dati?.marca, "capelli");
  assert.equal(r[0].dati?.categoria, "GOMMONE");
  assert.equal(r[0].dati?.condizione, "PRONTA_CONSEGNA");
  assert.equal(r[0].dati?.descrizione, 'Con "tendalino"; nuovo');
  assert.match(r[1].errore!, /marchio/);
  assert.equal(r[2].dati?.condizione, "DA_ORDINARE");
  assert.equal(leggiCsv("a,b\n1,2").length, 2);
});

test("foto abbinate per nome file", async () => {
  const { abbinaMezzo } = await import("../lib/vetrina/strumenti");
  const m = [
    { id: "1", marca: "capelli", modello: "Tempest 700" },
    { id: "2", marca: "capelli", modello: "Tempest 700 Open" },
    { id: "3", marca: "yamaha", modello: "F150" },
  ];
  assert.deepEqual(abbinaMezzo("capelli-tempest-700.jpg", m), { id: "1", ordine: 1 });
  assert.deepEqual(abbinaMezzo("Capelli Tempest 700-3.JPG", m), { id: "1", ordine: 3 });
  assert.deepEqual(abbinaMezzo("tempest-700-open.png", m), { id: "2", ordine: 1 });
  assert.deepEqual(abbinaMezzo("f150-2.jpg", m), { id: "3", ordine: 2 });
  assert.equal(abbinaMezzo("sconosciuto.jpg", m), null);
});
