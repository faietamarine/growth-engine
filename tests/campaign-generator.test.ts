import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCampaign, detectScenario, extractSubject, allocateBudget, addDays, diffDays, stagione, slugify, rescalePlan, defaultBudget } from "../lib/campaigns/generate";
import { SCENARI, CPL_RIFERIMENTO } from "../lib/campaigns/scenarios";
import { allowedTransitions, canTransition, editScope } from "../lib/campaigns/status";
import { writeCopy } from "../lib/ai/copywriter";

const OGGI = "2027-01-15";

test("scenario: gli esempi della richiesta vanno nel modello giusto", () => {
  const casi: [string, string][] = [
    ["Generare richieste di prova in mare per barche a vela usate", "prova-mare"],
    ["Acquisire lead per noleggio estivo", "noleggio"],
    ["Recuperare proprietari di barche per manutenzione primaverile", "manutenzione"],
    ["Promuovere un salone nautico o un open day", "salone"],
    ["Generare richieste di valutazione per permuta", "permuta"],
    ["Open day in marina ad aprile", "open-day"],
    ["Guida all'acquisto della prima barca", "prima-barca"],
    ["Campagna presenta un amico", "referral"],
    ["Riattivare i clienti passati", "riattivazione"],
    ["Vendere gommoni con pagamento a rate", "finanziamento"],
    ["Aumentare le vendite", "consulenza"],
  ];
  for (const [t, k] of casi) assert.equal(detectScenario(t).key, k, t);
});

test("soggetto: tipo, marca, usato/nuovo con il genere giusto", () => {
  assert.equal(extractSubject("prova in mare per barche a vela usate"), "barche a vela usate");
  assert.equal(extractSubject("gommoni Joker nuovi"), "gommoni Joker Boat nuovi");
  assert.equal(extractSubject("moto d'acqua Yamaha usate"), "moto d'acqua Yamaha usate");
  assert.equal(extractSubject("modelli Capelli"), "i modelli Capelli");
  assert.equal(extractSubject("aumentare le vendite"), null);
});

test("quote dei canali: ogni scenario somma 100", () => {
  for (const s of SCENARI) assert.equal(s.mix.reduce((t, [, q]) => t + q, 0), 100, s.key);
});

test("budget: la somma dei canali è esattamente il budget, anche con resti", () => {
  for (const s of SCENARI) {
    for (const b of [0, 1, 199, 1000, 2399, 4501, 12345]) {
      const c = allocateBudget(b, s.mix, s.organici, 60);
      assert.equal(c.reduce((t, x) => t + x.budget, 0), b, `${s.key} ${b}`);
      for (const x of c) {
        assert.ok(Number.isInteger(x.budget) && x.budget >= 0);
        assert.equal(x.leadStimati, x.cplStimato > 0 ? Math.floor(x.budget / x.cplStimato) : x.leadStimati);
      }
    }
  }
});

test("prova in mare 2.000 € per 60 giorni: numeri controllati a mano", () => {
  const g = generateCampaign({ obiettivo: "Prove in mare barche a vela usate", dataInizio: "2027-03-01", durataGiorni: 60, budget: 2000, oggi: OGGI });
  const by = Object.fromEntries(g.plan.canali.map((c) => [c.canale, c]));
  // META 55% = 1100 € / 30 = 36 lead; GOOGLE 35% = 700 € / 45 = 15; WHATSAPP 10% = 200 € / 8 = 25; ORGANICO 2×60/30 = 4
  assert.equal(by.META.budget, 1100);
  assert.equal(by.META.leadStimati, 36);
  assert.equal(by.GOOGLE.budget, 700);
  assert.equal(by.GOOGLE.leadStimati, 15);
  assert.equal(by.WHATSAPP.budget, 200);
  assert.equal(by.WHATSAPP.leadStimati, 25);
  assert.equal(by.ORGANICO.leadStimati, 4);
  const tot = 36 + 15 + 25 + 4; // 80
  const kpi = Object.fromEntries(g.plan.kpi.map((k) => [k.nome, k.target]));
  assert.equal(kpi["Lead totali stimati"], tot);
  assert.equal(kpi["Lead qualificati (obiettivo)"], Math.round(tot * 0.6)); // 48
  assert.equal(g.leadTarget, 48);
  assert.equal(kpi["Costo per lead qualificato"], Math.round(2000 / 48)); // 42
  assert.equal(kpi["Prove in mare effettuate"], Math.round(48 * 0.45)); // 22
  assert.equal(g.endDate, "2027-04-30");
  assert.equal(g.reparto, "VENDITA");
  assert.match(g.name, /Prova in mare — Barche a vela usate · Primavera 2027/);
  assert.match(g.plan.promessa, /barche a vela usate/);
  assert.equal(g.utmBase, "prova-mare-barche-a-vela-usate-primavera-2027");
  assert.equal(CPL_RIFERIMENTO.META, 30);
});

test("budget di default proporzionato alla durata, minimo 200 €", () => {
  const s = SCENARI.find((x) => x.key === "manutenzione")!;
  assert.equal(defaultBudget(s, 60), 800);
  assert.equal(defaultBudget(s, 90), 1200);
  assert.equal(defaultBudget(s, 10), 200); // 133 → minimo 200
});

test("obiettivo lead troppo alto: avviso con il budget necessario", () => {
  const g = generateCampaign({ obiettivo: "permuta", dataInizio: "2027-03-01", durataGiorni: 60, budget: 1000, leadTarget: 100, oggi: OGGI });
  assert.equal(g.leadTarget, 100);
  const w = g.plan.avvertenze.find((a) => a.startsWith("Obiettivo ambizioso"));
  assert.ok(w, "manca l'avviso");
  // GOOGLE 500/45=11, META 400/30=13, EMAIL 100/10=10, ORGANICO 4 → 38 × 0,65 = 25 qualificati
  assert.match(w!, /circa 25 lead qualificati/);
  assert.match(w!, /4\.000 €/); // 1000 × 100/25 = 4000
});

test("calendario: date coerenti, preparazione prima del lancio, evento a fine campagna", () => {
  const g = generateCampaign({ obiettivo: "open day in marina", dataInizio: "2027-03-01", durataGiorni: 45, oggi: OGGI });
  const cal = g.plan.calendario;
  for (const c of cal) assert.equal(c.data, addDays("2027-03-01", c.giorno));
  for (let i = 1; i < cal.length; i++) assert.ok(cal[i].giorno >= cal[i - 1].giorno, "non ordinato");
  assert.ok(cal.some((c) => c.tipo === "preparazione" && c.giorno < 0));
  const evento = cal.find((c) => c.attivita.startsWith("Giorno dell'evento"))!;
  assert.equal(evento.data, g.endDate);
  assert.equal(cal.filter((c) => c.tipo === "chiusura").length, 1);
  assert.ok(g.plan.avvertenze.some((a) => a.includes("coincide con la data di fine")));
});

test("preparazione in ritardo: avvisa e propone una nuova data", () => {
  const g = generateCampaign({ obiettivo: "permuta", dataInizio: "2027-01-20", durataGiorni: 30, oggi: OGGI });
  // il primo passo è a -10 giorni (10/01) < oggi (15/01): partenza consigliata 15/01 + 10 = 25/01
  assert.ok(g.plan.avvertenze.some((a) => a.includes("Partenza consigliata dal 25/01/2027")));
});

test("stagionalità e reparti", () => {
  const nol = generateCampaign({ obiettivo: "noleggio gommoni", dataInizio: "2026-11-20", durataGiorni: 60, oggi: "2026-11-01" });
  assert.equal(nol.reparto, "NOLEGGIO");
  assert.ok(nol.plan.avvertenze.some((a) => a.startsWith("Partenza fuori stagione")));
  assert.ok(nol.plan.avvertenze.some((a) => a.includes("Lead Vendita")));
  const man = generateCampaign({ obiettivo: "tagliando motori fuoribordo", dataInizio: "2027-02-10", durataGiorni: 45, oggi: OGGI });
  assert.equal(man.reparto, "SERVICE");
  assert.ok(man.plan.avvertenze.some((a) => a.includes("Periodo ideale")));
  const forzato = generateCampaign({ obiettivo: "tagliando", reparto: "VENDITA", dataInizio: "2027-02-10", durataGiorni: 45, oggi: OGGI });
  assert.equal(forzato.reparto, "VENDITA");
});

test("date e nomi: anni bisestili, inverno a cavallo d'anno, slug", () => {
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2027-03-27", 2), "2027-03-29"); // cambio dell'ora legale
  assert.equal(diffDays("2027-03-01", "2027-02-01"), 28);
  assert.equal(stagione("2026-12-10"), "Inverno 2026-27");
  assert.equal(stagione("2027-01-10"), "Inverno 2026-27");
  assert.equal(slugify("Moto d'acqua — Città è bella!"), "moto-dacqua-citta-e-bella");
});

test("ricalcolo con nuovo budget: somma esatta, quote salvate rispettate", () => {
  const g = generateCampaign({ obiettivo: "salone nautico", dataInizio: "2027-03-01", durataGiorni: 60, budget: 3000, oggi: OGGI });
  const r = rescalePlan(g.plan, 4999, 60);
  assert.equal(r.canali.reduce((t, c) => t + c.budget, 0), 4999);
  assert.deepEqual(r.canali.map((c) => c.quota), g.plan.canali.map((c) => c.quota));
  const qual = r.kpi.find((k) => k.nome === "Lead qualificati (obiettivo)")!.target;
  assert.equal(r.leadTarget, qual);
});

test("generatore deterministico", () => {
  const i = { obiettivo: "prove in mare gommoni", dataInizio: "2027-03-01", durataGiorni: 60, oggi: OGGI };
  const now = new Date("2027-01-15T10:00:00Z");
  assert.deepEqual(generateCampaign(i, now), generateCampaign(i, now));
});

test("stati: passaggi ammessi per ruolo", () => {
  assert.ok(canTransition("BOZZA", "REVISIONE", "MARKETING"));
  assert.ok(!canTransition("BOZZA", "PUBBLICATO", "ADMIN")); // niente salti
  assert.ok(!canTransition("REVISIONE", "APPROVATO", "CONTENT"));
  assert.ok(canTransition("REVISIONE", "APPROVATO", "MARKETING"));
  assert.deepEqual(allowedTransitions("CONCLUSO", "ADMIN"), []);
  assert.deepEqual(allowedTransitions("BOZZA", "EVENT"), []);
  assert.equal(editScope("PUBBLICATO"), "operativo");
  assert.equal(editScope("CONCLUSO"), "spesa");
  assert.equal(editScope("APPROVATO"), "tutto");
});

test("AI: senza configurazione restano i testi del modello; risposta valida o errata gestita", async () => {
  const base = generateCampaign({ obiettivo: "permuta", dataInizio: "2027-03-01", durataGiorni: 60, oggi: OGGI });
  delete process.env.AI_PROVIDER;
  assert.equal((await writeCopy(base)).provider, "mock");

  process.env.AI_PROVIDER = "anthropic";
  process.env.ANTHROPIC_API_KEY = "test";
  const copy = {
    nome: "Valuta e cambia barca — Primavera",
    angolo: "Un angolo nuovo e concreto",
    promessa: "Una promessa chiara e verificabile",
    hook: ["uno", "due", "tre"],
    painPoint: ["dolore uno", "dolore due", "dolore tre"],
    desideri: ["desiderio uno", "desiderio due"],
    obiezioni: [
      { obiezione: "costa", risposta: "ecco perché no" },
      { obiezione: "tempo", risposta: "bastano 48 ore" },
    ],
    offerta: "Valutazione gratuita in 48 ore",
    cta: "Valuta ora",
    audience: [
      { nome: "Proprietari", descrizione: "Barca di 10 anni" },
      { nome: "Clienti", descrizione: "Già nostri clienti" },
    ],
  };
  const ok = (async () => new Response(JSON.stringify({ content: [{ type: "tool_use", name: "scrivi_testi_campagna", input: copy }] }), { status: 200 })) as unknown as typeof fetch;
  const r = await writeCopy(base, undefined, ok);
  assert.equal(r.provider, "anthropic");
  assert.equal(r.campaign.plan.cta, "Valuta ora");
  assert.deepEqual(r.campaign.plan.canali, base.plan.canali); // i numeri non cambiano
  assert.equal(r.campaign.budget, base.budget);

  const rotto = (async () => new Response(JSON.stringify({ content: [{ type: "tool_use", name: "scrivi_testi_campagna", input: { nome: "x" } }] }), { status: 200 })) as unknown as typeof fetch;
  const r2 = await writeCopy(base, undefined, rotto);
  assert.equal(r2.provider, "mock");
  assert.equal(r2.campaign.plan.angolo, base.plan.angolo);
  const err = (async () => new Response("errore", { status: 529 })) as unknown as typeof fetch;
  assert.equal((await writeCopy(base, undefined, err)).provider, "mock");
  delete process.env.AI_PROVIDER;
  delete process.env.ANTHROPIC_API_KEY;
});

import { utmQuery, channelFromUtm, UTM_CANALE } from "../lib/campaigns/utm";
test("UTM: andata e ritorno canale → parametri → canale", () => {
  assert.equal(utmQuery("META", "prova-mare-2027"), "utm_source=facebook&utm_medium=cpc&utm_campaign=prova-mare-2027");
  for (const [c, u] of Object.entries(UTM_CANALE)) {
    if (c === "SITO") continue; // il sito non ha una sorgente esterna
    assert.equal(channelFromUtm(u.source, u.medium), c, c);
  }
  assert.equal(channelFromUtm("bing", "cpc"), null);
});
