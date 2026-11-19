import { test } from "node:test";
import assert from "node:assert/strict";
import { esempioFinanziamento, finanziamentoMostrabile, finanziamentoSchema, FINANZIAMENTO_VUOTO } from "../lib/vetrina/finanziamento";

const senzaSpese = { tan: 7.9, speseIstruttoria: 0, speseIncasso: 0, impostaBollo: 0 };

test("rata a tasso fisso e TAEG senza spese = tasso effettivo annuo", () => {
  const e = esempioFinanziamento(12500, 20, 60, senzaSpese)!;
  assert.equal(e.anticipo, 2500);
  assert.equal(e.credito, 10000);
  assert.equal(e.rata, 202.29); // 10.000 € in 60 rate al 7,9%
  assert.equal(e.taeg, 8.19); // (1 + 0,079/12)^12 - 1
  assert.equal(e.totaleDovuto, 12137.4);
});

test("le spese alzano il TAEG e il totale dovuto", () => {
  const e = esempioFinanziamento(12500, 20, 60, { tan: 7.9, speseIstruttoria: 300, speseIncasso: 3, impostaBollo: 16 })!;
  assert.equal(e.rata, 205.29);
  assert.equal(e.totaleDovuto, 205.29 * 60 + 316);
  assert.ok(e.taeg > 9.5 && e.taeg < 10.5, `TAEG ${e.taeg}`);
});

test("TAN zero e niente spese: TAEG zero", () => {
  const e = esempioFinanziamento(10000, 0, 24, { tan: 0, speseIstruttoria: 0, speseIncasso: 0, impostaBollo: 0 })!;
  assert.equal(e.taeg, 0);
  assert.equal(e.rata, 416.67);
});

test("si mostra solo se completo, valido e sopra il minimo", () => {
  const f = { ...FINANZIAMENTO_VUOTO, attivo: true, finanziaria: "Finanziaria Spa", contatti: "800 000 000", tan: 7.9 };
  assert.equal(finanziamentoMostrabile(f, 20000, "2026-11-19"), true);
  assert.equal(finanziamentoMostrabile({ ...f, contatti: "" }, 20000, "2026-11-19"), false);
  assert.equal(finanziamentoMostrabile({ ...f, validoFino: "2026-11-18" }, 20000, "2026-11-19"), false);
  assert.equal(finanziamentoMostrabile(f, 2000, "2026-11-19"), false);
  assert.equal(finanziamentoMostrabile(f, null, "2026-11-19"), false);
});

test("impostazioni: senza finanziaria non si attiva", () => {
  const base = { tan: "7,9", durate: "36, 60, 84", durataPredefinita: "60", anticipoMinimo: "10", anticipoPredefinito: "20", importoMinimo: "3000", impostaBollo: "16" };
  assert.equal(finanziamentoSchema.safeParse({ ...base, attivo: "on" }).success, false);
  const ok = finanziamentoSchema.parse({ ...base, attivo: "on", finanziaria: "X Spa", contatti: "x.it" });
  assert.deepEqual(ok.durate, [36, 60, 84]);
  assert.equal(ok.tan, 7.9);
});
