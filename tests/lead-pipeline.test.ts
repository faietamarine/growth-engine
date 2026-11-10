import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, leadInputSchema } from "../src/lib/leads/validation";
import { scoreLead, isQualified, scoreBand } from "../src/lib/leads/score";
import { buildNautilusImport, leadsToCsv, origineNautilus, prossimoGiornoLavorativo, dataItalia, NAUTILUS_ORIGINI } from "../src/lib/crm/nautilus";
import type { Lead } from "../src/db/schema";

test("telefono: normalizzazione italiani ed esteri", () => {
  assert.equal(normalizePhone("333 123 4567"), "+39 3331234567");
  assert.equal(normalizePhone("+39 333-123-4567"), "+39 3331234567");
  assert.equal(normalizePhone("0039 085 1234567"), "+39 0851234567");
  assert.equal(normalizePhone("085/421234"), "+39 085421234");
  assert.equal(normalizePhone("+44 7700 900123"), "+447700900123");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("333abc4567"), null);
  // l'ultimo blocco di 9 cifre resta quello usato dal CRM per riconoscere i doppioni
  assert.equal(normalizePhone("3331234567")!.replace(/\D/g, "").slice(-9), "331234567");
});

test("validazione: consenso privacy obbligatorio e campo trappola", () => {
  const base = { nome: "Mario", telefono: "3331234567", consensoPrivacy: true };
  assert.equal(leadInputSchema.safeParse(base).success, true);
  assert.equal(leadInputSchema.safeParse({ ...base, consensoPrivacy: false }).success, false);
  assert.equal(leadInputSchema.safeParse({ ...base, sito: "http://spam" }).success, false);
  assert.equal(leadInputSchema.safeParse({ ...base, telefono: "12" }).success, false);
  assert.equal(leadInputSchema.safeParse({ ...base, email: "non-email" }).success, false);
});

test("punteggio vendita: somma corretta e massimo 100", () => {
  const max = scoreLead({ reparto: "VENDITA", email: "a@b.it", interesse: "Joker 22", budget: 50000, tempistica: "Entro 3 mesi", zona: "Pescara", messaggio: "x".repeat(25), consensoMarketing: true });
  assert.equal(max.score, 100); // 10+15+20+30+5+10+10
  const minimo = scoreLead({ reparto: "VENDITA" });
  assert.equal(minimo.score, 0);
  const tipico = scoreLead({ reparto: "VENDITA", email: "a@b.it", interesse: "Gommone 6 m", tempistica: "Entro 6 mesi" });
  assert.equal(tipico.score, 45); // 10+15+20
  assert.equal(isQualified(45, 40), true);
  assert.equal(isQualified(39, 40), false);
});

test("punteggio service: il budget non conta, l'interesse vale 35", () => {
  const s = scoreLead({ reparto: "SERVICE", email: "a@b.it", interesse: "Tagliando F115", budget: 9999, tempistica: "Urgente", zona: "Ortona", messaggio: "y".repeat(30), consensoMarketing: true });
  assert.equal(s.score, 100); // 10+35+30+5+10+10
  assert.equal(scoreBand(70), "caldo");
  assert.equal(scoreBand(40), "tiepido");
  assert.equal(scoreBand(39), "freddo");
});

test("origine: ogni canale produce un valore ammesso dal CRM", () => {
  for (const c of ["META", "GOOGLE", "EMAIL", "WHATSAPP", "ORGANICO", "EVENTO", "REFERRAL", "SITO"] as const) {
    assert.ok(NAUTILUS_ORIGINI.includes(origineNautilus(c)), c);
  }
  assert.equal(origineNautilus("ORGANICO", "instagram"), "Instagram / Facebook");
  assert.equal(origineNautilus("EVENTO"), "Fiera / evento");
});

test("prossimo contatto: salta la domenica, fuso di Roma", () => {
  // Sabato 13/03/2027 ore 23:30 a Roma (22:30 UTC) → domenica saltata → lunedì 15
  assert.equal(prossimoGiornoLavorativo(new Date("2027-03-13T22:30:00Z")), "2027-03-15");
  // Lunedì → martedì
  assert.equal(prossimoGiornoLavorativo(new Date("2027-03-15T09:00:00Z")), "2027-03-16");
  // 23:30 UTC del 31/12 è già 1 gennaio a Roma
  assert.equal(dataItalia(new Date("2026-12-31T23:30:00Z")), "2027-01-01");
});

const lead = (o: Partial<Lead>): Lead => ({
  id: "11111111-1111-4111-8111-111111111111",
  firstName: "Giulia",
  lastName: "Di Febo",
  company: "",
  phone: "+39 3331234567",
  email: "giulia@esempio.it",
  interest: "Joker Boat Clubman 22",
  budget: 48000,
  zone: "Pescara",
  timeframe: "Entro 3 mesi",
  message: "",
  answers: { "Hai già una barca?": "No" },
  channel: "META",
  sourceLabel: "Landing prova in mare",
  utm: { source: "facebook", medium: "cpc", campaign: "prova-mare" },
  consents: { privacy: true, marketing: true, profilazione: false, testoInformativa: "v1", il: "2027-03-10T10:00:00Z" },
  reparto: "VENDITA",
  score: 75,
  status: "QUALIFICATO",
  campaignId: "c1",
  landingPageId: null,
  eventId: null,
  variant: null,
  checkedInAt: null,
  onSite: false,
  deliveredAt: null,
  deliveryBatch: null,
  createdAt: new Date("2027-03-10T10:00:00Z"),
  updatedAt: new Date("2027-03-10T10:00:00Z"),
  ...o,
});

test("file Nautilus: smista Vendita/Noleggio nei Lead e Service nei Lead Service", () => {
  const ora = new Date("2027-03-12T09:00:00Z"); // venerdì
  const f = buildNautilusImport(
    [lead({}), lead({ id: "s1", reparto: "SERVICE", interest: "Tagliando 100 h", score: 50 }), lead({ id: "n1", reparto: "NOLEGGIO", interest: "Gommone 40 cv luglio", score: 45 })],
    new Map([["c1", "Prova in mare Joker"]]),
    { lotto: "GE-TEST", utente: "Marco", ora },
  );
  assert.equal(f.formato, "nautilus-evo-lead-import");
  assert.equal(f.lead.length, 2);
  assert.equal(f.leadService.length, 1);

  const v = f.lead[0];
  assert.equal(v.id, "ge_11111111-1111-4111-8111-111111111111");
  assert.equal(v.stato, "Qualificato");
  assert.equal(v.venditore, "MARCO");
  assert.equal(v.origine, "Instagram / Facebook");
  assert.equal(v.probabilita, 30); // punteggio ≥ 70
  assert.equal(v.budget, 48000);
  assert.equal(v.prossimoContatto, "2027-03-13"); // sabato lavorativo
  assert.deepEqual(v.storicoStati, [{ stato: "Qualificato", data: "2027-03-12" }]);
  assert.match(v.note, /Campagna: Prova in mare Joker/);
  assert.match(v.note, /marketing sì/);
  assert.match(v.note, /Hai già una barca\?: No/);

  assert.equal(f.lead[1].interesse, "Noleggio: Gommone 40 cv luglio");
  assert.equal(f.lead[1].probabilita, 10);

  const s = f.leadService[0];
  assert.equal(s.responsabile, "DANIELE");
  assert.equal(s.stato, "Richiesta ricevuta");
  assert.equal(s.origine, "Richiesta cliente");
  // Stessi campi che saveLeadService() del CRM salva
  assert.deepEqual(Object.keys(s).sort(), ["appuntamenti", "attivita", "azienda", "cognome", "createdAt", "email", "id", "interesse", "nome", "note", "origine", "prossimoContatto", "responsabile", "stato", "storicoStati", "telefono", "updatedAt"].sort());
});

test("CSV: separatore ;, BOM per Excel, telefoni intatti, formule neutralizzate", () => {
  const csv = leadsToCsv([lead({ firstName: "=HYPERLINK(1)", interest: 'Barca "rossa"; 7 m' })], new Map([["c1", "Camp"]]));
  assert.ok(csv.startsWith("﻿"));
  const riga = csv.split("\r\n")[1];
  assert.match(riga, /;'=HYPERLINK\(1\);/);
  assert.match(riga, /;\+39 3331234567;/);
  assert.match(riga, /"Barca ""rossa""; 7 m"/);
});

test("fascia di budget: diventa il valore centrale e resta nelle risposte", () => {
  const r = leadInputSchema.parse({ nome: "Mario", telefono: "3331234567", consensoPrivacy: true, budgetFascia: "20.000–50.000" });
  assert.equal(r.budget, 35000);
  assert.equal(r.risposte["Budget indicato"], "20.000–50.000");
  const esplicito = leadInputSchema.parse({ nome: "Mario", telefono: "3331234567", consensoPrivacy: true, budget: 40000, budgetFascia: "Oltre 100.000" });
  assert.equal(esplicito.budget, 40000); // il numero esplicito prevale
  const ignota = leadInputSchema.parse({ nome: "Mario", telefono: "3331234567", consensoPrivacy: true, budgetFascia: "boh" });
  assert.equal(ignota.budget, undefined);
});
