import { test } from "node:test";
import assert from "node:assert/strict";
import { bloccoIniziali, bloccoVuoto, problemiPubblicazione, embedVideo, TIPI_BLOCCO, blocchiSchema, CAMPI_BASE } from "../src/lib/landing/blocks";
import { applicaVariante, confrontaVarianti, scegliVariante } from "../src/lib/landing/ab";
import { generateLeadMagnet } from "../src/lib/leadmagnets/generate";
import { getTemplate } from "../src/lib/funnels/templates";
import { informativaCompilata, DEFAULT_SETTINGS } from "../src/lib/settings/defaults";
import type { Blocco } from "../src/types/landing";

const t = getTemplate("prova-mare")!;
const funnel = { promise: t.promessa, cta: t.cta, formFields: t.form, steps: t.steps, leadMagnet: t.leadMagnet };

test("bozza da funnel + lead magnet: apertura, form del funnel, FAQ, nessuna testimonianza inventata", () => {
  const lm = generateLeadMagnet({ tipo: "prova-mare", tema: "gommoni Joker Boat" }).content;
  const b = bloccoIniziali({ titolo: "Prova", funnel, leadMagnet: lm });
  assert.equal(b[0].tipo, "hero");
  assert.equal((b[0] as Extract<Blocco, { tipo: "hero" }>).headline, lm.landing.headline);
  const form = b.find((x) => x.tipo === "form") as Extract<Blocco, { tipo: "form" }>;
  assert.deepEqual(form.campi, t.form);
  assert.match(form.grazie, /entro un giorno lavorativo/);
  assert.ok(b.some((x) => x.tipo === "faq"));
  assert.ok(!b.some((x) => x.tipo === "testimonianze"));
  assert.deepEqual(problemiPubblicazione(b), []);
  assert.ok(blocchiSchema.safeParse(b).success);
});

test("bozza senza sorgenti: form con i campi base", () => {
  const b = bloccoIniziali({ titolo: "Pagina vuota" });
  assert.equal((b[0] as Extract<Blocco, { tipo: "hero" }>).headline, "Pagina vuota");
  assert.deepEqual((b.find((x) => x.tipo === "form") as Extract<Blocco, { tipo: "form" }>).campi, CAMPI_BASE);
  assert.deepEqual(problemiPubblicazione(b), []);
});

test("ogni blocco vuoto ha un tipo noto", () => {
  for (const { tipo } of TIPI_BLOCCO) assert.equal(bloccoVuoto(tipo).tipo, tipo);
});

test("regole di pubblicazione", () => {
  const ok = bloccoIniziali({ titolo: "Ok", funnel });
  assert.match(problemiPubblicazione(ok.filter((x) => x.tipo !== "form")).join(), /Serve un blocco Form/);
  assert.match(problemiPubblicazione([...ok, bloccoVuoto("form")]).join(), /un solo blocco Form/);
  assert.match(problemiPubblicazione([...ok].reverse()).join(), /iniziare con il blocco Apertura/);
  const senzaTel = ok.map((x) => (x.tipo === "form" ? { ...x, campi: x.campi.filter((c) => c.nome !== "telefono") } : x));
  assert.match(problemiPubblicazione(senzaTel).join(), /telefono/);
  const httpImg = ok.map((x) => (x.tipo === "hero" ? { ...x, immagine: "http://sito.it/foto.jpg" } : x));
  assert.match(problemiPubblicazione(httpImg).join(), /https/);
  const jsImg = ok.map((x) => (x.tipo === "hero" ? { ...x, immagine: "javascript:alert(1)" } : x));
  assert.match(problemiPubblicazione(jsImg).join(), /https/);
});

test("video: YouTube senza cookie e Vimeo; il resto rifiutato", () => {
  assert.equal(embedVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(embedVideo("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(embedVideo("https://youtube.com/shorts/abcDEF12345"), "https://www.youtube-nocookie.com/embed/abcDEF12345");
  assert.equal(embedVideo("https://vimeo.com/123456789"), "https://player.vimeo.com/video/123456789?dnt=1");
  assert.equal(embedVideo("https://example.com/video.mp4"), null);
  assert.equal(embedVideo("non un url"), null);
});

test("A/B: la variante B cambia solo l'elemento scelto", () => {
  const b = bloccoIniziali({ titolo: "Ok", funnel });
  const ab = { attivo: true, elemento: "cta" as const, valoreB: "Prenota ora", iniziatoIl: "" };
  const vb = applicaVariante(b, ab, "B");
  for (const x of vb) if (x.tipo === "hero" || x.tipo === "form" || x.tipo === "cta") assert.equal(x.cta, "Prenota ora");
  assert.equal((vb[0] as Extract<Blocco, { tipo: "hero" }>).headline, (b[0] as Extract<Blocco, { tipo: "hero" }>).headline);
  assert.deepEqual(applicaVariante(b, ab, "A"), b);
  assert.deepEqual(applicaVariante(b, { ...ab, attivo: false }, "B"), b);
  const h = applicaVariante(b, { ...ab, elemento: "headline", valoreB: "Nuovo titolo" }, "B");
  assert.equal((h[0] as Extract<Blocco, { tipo: "hero" }>).headline, "Nuovo titolo");
  assert.equal(scegliVariante(0.1), "A");
  assert.equal(scegliVariante(0.9), "B");
});

test("A/B: confronto statistico con numeri controllati a mano", () => {
  // Pochi dati: nessun vincitore.
  assert.equal(confrontaVarianti(50, 5, 60, 12).vincitore, null);
  // 1000 visite ciascuna, 50 vs 80 lead: p=0,065, se=√(0,065×0,935×0,002)=0,011025, z=0,03/0,011025=2,72 → B vince.
  const r = confrontaVarianti(1000, 50, 1000, 80);
  assert.equal(r.vincitore, "B");
  assert.ok(Math.abs(r.z - 2.721) < 0.01, String(r.z));
  assert.ok(Math.abs(r.differenza - 3) < 1e-9);
  // 1000 vs 1000, 50 vs 60: z≈0,98 → nessun vincitore.
  assert.equal(confrontaVarianti(1000, 50, 1000, 60).vincitore, null);
  // A meglio di B.
  assert.equal(confrontaVarianti(800, 80, 800, 40).vincitore, "A");
  // Nessuna conversione: nessuna divisione per zero.
  assert.equal(confrontaVarianti(200, 0, 200, 0).vincitore, null);
});

test("informativa: segnaposto sostituiti, campi mancanti segnalati", () => {
  const s = informativaCompilata(DEFAULT_SETTINGS);
  assert.doesNotMatch(s, /\{ragioneSociale\}|\{indirizzo\}|\{nomeCommerciale\}/);
  assert.match(s, /Faieta Motors S\.r\.l\./);
  assert.match(s, /\[email privacy da inserire\]/);
  assert.match(informativaCompilata({ ...DEFAULT_SETTINGS, emailPrivacy: "privacy@esempio.it" }), /privacy@esempio\.it/);
});

import { dataBreve } from "../src/lib/labels";
test("date brevi: giorno, data e ora completa, fuso di Roma", () => {
  assert.equal(dataBreve("2026-11-09"), "09 nov");
  assert.equal(dataBreve("2026-11-09T22:30:00.000Z"), "09 nov"); // 23:30 a Roma
  assert.equal(dataBreve("2026-11-09T23:30:00.000Z"), "10 nov"); // 00:30 a Roma
});
