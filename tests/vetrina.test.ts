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
});

test("prezzo e dati vitali", () => {
  assert.equal(euro(null), "Su richiesta");
  assert.match(euro(39000), /39\.000/);
  assert.deepEqual(datiVitali({ anno: 2020, lunghezza: 7.5, motore: "", ore: 0, posti: null }).map((d) => d.k), ["Anno", "Lunghezza", "Ore motore"]);
});

test("quiz: il profilo premia le categorie giuste e le tempistiche del punteggio lead", () => {
  const p = profiloQuiz({ uso: "Crociera", persone: "Più di cinque", quando: "Subito, pronta consegna" });
  assert.ok(p.categorie.includes("CABINATO") && p.categorie.includes("VELA"));
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
