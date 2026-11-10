import { test } from "node:test";
import assert from "node:assert/strict";
import { LM_TIPI, LM_PER_SCENARIO, CHECKLIST_COMUNE, getLmTipo } from "../src/lib/leadmagnets/catalog";
import { generateLeadMagnet, controllaLimiti, entroLimite, lmContentSchema } from "../src/lib/leadmagnets/generate";
import { LIMITI } from "../src/types/lead-magnet";
import { SCENARI, SCENARIO_GENERICO } from "../src/lib/campaigns/scenarios";
import { getTemplate } from "../src/lib/funnels/templates";

const SOGGETTI = [undefined, "gommoni Joker Boat", "barche a vela usate", "moto d'acqua Yamaha usate", "tagliando motori fuoribordo Yamaha da 150 cavalli e oltre per la stagione"];

test("12 tipi richiesti, chiavi uniche, funnel collegati esistenti", () => {
  assert.equal(LM_TIPI.length, 12);
  assert.equal(new Set(LM_TIPI.map((t) => t.key)).size, 12);
  for (const t of LM_TIPI) assert.ok(getTemplate(t.funnel), `${t.key} → ${t.funnel}`);
  for (const s of [...SCENARI, SCENARIO_GENERICO]) assert.ok(getLmTipo(LM_PER_SCENARIO[s.key]), s.key);
});

test("ogni tipo genera tutte le parti richieste, entro i limiti, con qualsiasi soggetto", () => {
  for (const t of LM_TIPI) {
    for (const tema of SOGGETTI) {
      const { content: c } = generateLeadMagnet({ tipo: t.key, tema });
      const dove = `${t.key} / ${tema ?? "predefinito"}`;
      assert.deepEqual(controllaLimiti(c), [], dove);
      assert.ok(lmContentSchema.safeParse(c).success, dove);
      assert.ok(c.titolo && c.sottotitolo && c.promessa, dove);
      assert.ok(c.benefici.length >= 3 && c.obiezioni.length >= 2 && c.struttura.length >= 1, dove);
      assert.ok(c.landing.headline && c.landing.bullet.length >= 3 && c.landing.faq.length >= 2 && c.landing.cta, dove);
      assert.ok(c.metaAds.length >= 1, dove);
      assert.ok(c.googleAds.titoli.length >= 3, `${dove}: titoli Google ${c.googleAds.titoli.length}`);
      assert.ok(c.googleAds.descrizioni.length >= 1, dove);
      assert.ok(c.email.oggetto && c.email.testo && c.whatsapp.length >= 1, dove);
      assert.ok(c.promptImmagini.length >= 1 && c.promptVideo.length >= 1, dove);
      assert.equal(c.checklist.length, t.checklist.length + CHECKLIST_COMUNE.length, dove);
      // nessun segnaposto rimasto, tranne quelli dei messaggi personali
      const tutto = JSON.stringify({ ...c, email: { ...c.email, testo: "" }, whatsapp: [] });
      assert.doesNotMatch(tutto, /\{s\}|\{S\}/, dove);
      for (const testo of [c.email.testo, ...c.whatsapp]) for (const m of testo.match(/\{[^}]+\}/g) ?? []) assert.ok(["{nome}", "{consulente}"].includes(m), `${dove}: ${m}`);
      // i titoli Google partono con la maiuscola e non si ripetono
      assert.equal(new Set(c.googleAds.titoli.map((x) => x.toLowerCase())).size, c.googleAds.titoli.length, dove);
    }
  }
});

test("soggetto: riconosciuto, testo breve usato così com'è, testo lungo ignorato", () => {
  assert.equal(generateLeadMagnet({ tipo: "prova-mare", tema: "provare gommoni Joker nuovi" }).content.soggetto, "gommoni Joker Boat nuovi");
  assert.equal(generateLeadMagnet({ tipo: "coupon", tema: "lavaggio carena" }).content.soggetto, "lavaggio carena");
  const lungo = "una frase molto lunga che non contiene nessun tipo di barca riconoscibile";
  assert.equal(generateLeadMagnet({ tipo: "coupon", tema: lungo, soggettoCampagna: "la tua barca" }).content.soggetto, "la tua barca");
  assert.equal(generateLeadMagnet({ tipo: "coupon", tema: lungo }).content.soggetto, "il tagliando");
});

test("titolo Google con soggetto troppo lungo: scartato, restano gli altri", () => {
  const { content } = generateLeadMagnet({ tipo: "prova-mare", tema: "moto d'acqua Yamaha usate" });
  assert.ok(!content.googleAds.titoli.some((x) => x.includes("Moto D'acqua")), "titolo oltre 30 caratteri non scartato");
  assert.ok(content.googleAds.titoli.every((x) => x.length <= LIMITI.googleTitolo));
  const corto = generateLeadMagnet({ tipo: "prova-mare", tema: "gommoni" }).content;
  assert.ok(corto.googleAds.titoli.includes("Prova Gommoni"));
});

test("entroLimite e controllaLimiti", () => {
  assert.deepEqual(entroLimite(["Uno", "uno", "x".repeat(31), "Due"], 30, 15), ["Uno", "Due"]);
  const { content } = generateLeadMagnet({ tipo: "guida" });
  const rotto = { ...content, googleAds: { ...content.googleAds, titoli: [...content.googleAds.titoli, "Questo titolo supera i trenta caratteri"] } };
  const a = controllaLimiti(rotto);
  assert.equal(a.length, 1);
  assert.equal(a[0].limite, 30);
  assert.equal(a[0].lunghezza, 39);
});

test("deterministico", () => {
  const now = new Date("2027-01-10T10:00:00Z");
  assert.deepEqual(generateLeadMagnet({ tipo: "quiz", tema: "cabinati" }, now), generateLeadMagnet({ tipo: "quiz", tema: "cabinati" }, now));
  assert.throws(() => generateLeadMagnet({ tipo: "inesistente" }));
});

import { rewriteLeadMagnet } from "../src/lib/ai/lm-copywriter";
test("AI: i testi oltre i limiti vengono scartati, il resto si usa", async () => {
  const base = generateLeadMagnet({ tipo: "permuta" }).content;
  process.env.AI_PROVIDER = "anthropic";
  process.env.ANTHROPIC_API_KEY = "test";
  const input = {
    titolo: "Quanto vale la tua barca?",
    sottotitolo: "Stima gratuita in 48 ore",
    promessa: "Una stima chiara e motivata",
    benefici: ["Uno", "Due", "Tre"],
    headline: "La tua barca, valutata bene",
    bullet: ["Punto A", "Punto B", "Punto C"],
    metaAds: [{ testoPrincipale: "x".repeat(200), titolo: "Titolo valido", descrizione: "Valida" }],
    googleTitoli: ["Titolo Valido Uno", "Titolo Valido Due", "Questo titolo è decisamente troppo lungo", "Terzo Titolo"],
    googleDescrizioni: ["Descrizione valida e abbastanza lunga da passare."],
    emailOggetto: "y".repeat(80),
    emailAnteprima: "Anteprima ok",
  };
  const f = (async () => new Response(JSON.stringify({ content: [{ type: "tool_use", name: "scrivi_lead_magnet", input }] }), { status: 200 })) as unknown as typeof fetch;
  const r = await rewriteLeadMagnet(base, "", f);
  assert.equal(r.provider, "anthropic");
  assert.deepEqual(r.content.googleAds.titoli, ["Titolo Valido Uno", "Titolo Valido Due", "Terzo Titolo"]);
  assert.deepEqual(r.content.metaAds, base.metaAds); // testo Meta troppo lungo → resta il modello
  assert.equal(r.content.email.oggetto, base.email.oggetto); // oggetto troppo lungo → resta il modello
  assert.equal(r.content.email.anteprima, "Anteprima ok");
  assert.deepEqual(controllaLimiti(r.content), []);
  delete process.env.AI_PROVIDER;
  delete process.env.ANTHROPIC_API_KEY;
});

import { lmToMarkdown } from "../src/lib/leadmagnets/markdown";
test("esportazione Markdown: tutte le sezioni e la checklist con le spunte", () => {
  const { title, content } = generateLeadMagnet({ tipo: "permuta", tema: "cabinati" });
  const md = lmToMarkdown(title, { ...content, checklist: content.checklist.map((x, i) => ({ ...x, fatto: i === 0 })) }, { tipo: "Valutazione permuta", campagna: "Prova", stato: "Bozza" });
  for (const h of ["## Promessa", "## Benefici", "## Struttura del contenuto", "## Landing page", "## Annunci Meta", "## Annunci Google", "## Email", "## WhatsApp", "## Prompt per immagini", "## Prompt per video", "## Checklist di pubblicazione"]) assert.ok(md.includes(h), h);
  assert.equal((md.match(/^- \[x\]/gm) ?? []).length, 1);
  assert.equal((md.match(/^- \[ \]/gm) ?? []).length, content.checklist.length - 1);
  assert.ok(md.startsWith(`# ${title}`));
});
