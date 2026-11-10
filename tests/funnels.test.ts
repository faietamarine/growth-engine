import { test } from "node:test";
import assert from "node:assert/strict";
import { FUNNEL_TEMPLATES, TEMPLATE_PER_SCENARIO, CAMPI_NOTI, getTemplate, anteprimaTesto } from "../src/lib/funnels/templates";
import { funnelSchema, nomeCampo } from "../src/lib/funnels/validation";
import { SCENARI, SCENARIO_GENERICO } from "../src/lib/campaigns/scenarios";
import { allowedTransitions, canTransition, funnelEditable } from "../src/lib/campaigns/status";
import { leadInputSchema } from "../src/lib/leads/validation";

const daModello = (key: string) => {
  const t = getTemplate(key)!;
  return { name: t.nome, campaignId: null, reparto: t.reparto, objective: t.obiettivo, audience: t.pubblico, promise: t.promessa, leadMagnet: t.leadMagnet, cta: t.cta, steps: t.steps, formFields: t.form, emails: t.emails, whatsapp: t.whatsapp, qualificationRules: t.qualificazione };
};

test("libreria: 12 modelli richiesti, chiavi uniche", () => {
  assert.equal(FUNNEL_TEMPLATES.length, 12);
  const k = FUNNEL_TEMPLATES.map((t) => t.key);
  assert.equal(new Set(k).size, 12);
});

test("ogni modello supera la stessa validazione dell'editor", () => {
  for (const t of FUNNEL_TEMPLATES) {
    const r = funnelSchema.safeParse(daModello(t.key));
    assert.ok(r.success, `${t.key}: ${!r.success && r.error.issues[0].message}`);
  }
});

test("ogni modello: passi numerati, email in ordine, segnaposto noti", () => {
  for (const t of FUNNEL_TEMPLATES) {
    t.steps.forEach((s, i) => assert.equal(s.ordine, i + 1, t.key));
    for (let i = 1; i < t.emails.length; i++) assert.ok(t.emails[i].giorno >= t.emails[i - 1].giorno, t.key);
    for (const testo of [...t.emails.flatMap((e) => [e.oggetto, e.testo]), ...t.whatsapp.map((w) => w.testo)]) {
      for (const m of testo.match(/\{[^}]+\}/g) ?? []) assert.ok(["{nome}", "{consulente}", "{data}"].includes(m), `${t.key}: segnaposto ${m}`);
      assert.doesNotMatch(anteprimaTesto(testo), /\{/);
    }
    assert.ok(t.qualificazione.length > 0 && t.cta.length <= 60, t.key);
  }
});

test("i dati di un form compilato arrivano alla raccolta lead con budget e risposte", () => {
  // Simula l'invio del form "prova in mare": campi noti + uno extra.
  const t = getTemplate("prova-mare")!;
  const noti = new Set<string>(CAMPI_NOTI);
  const extra = t.form.filter((c) => !noti.has(c.nome)).map((c) => c.nome);
  assert.deepEqual(extra, ["dataPreferita"]);
  const r = leadInputSchema.parse({ nome: "Luca", telefono: "3401234567", interesse: "Joker 22", budgetFascia: "50.000–100.000", tempistica: "Entro 3 mesi", risposte: { dataPreferita: "Sabato" }, consensoPrivacy: true });
  assert.equal(r.budget, 75000);
  assert.equal(r.risposte.dataPreferita, "Sabato");
});

test("ogni scenario del generatore ha un modello consigliato esistente", () => {
  for (const s of [...SCENARI, SCENARIO_GENERICO]) {
    const k = TEMPLATE_PER_SCENARIO[s.key];
    assert.ok(k && getTemplate(k), s.key);
  }
});

test("editor: nome e telefono non si tolgono né diventano facoltativi", () => {
  const base = daModello("consulenza");
  const senzaTel = { ...base, formFields: base.formFields.filter((c) => c.nome !== "telefono") };
  assert.match(funnelSchema.safeParse(senzaTel).error!.issues[0].message, /telefono/);
  const facoltativo = { ...base, formFields: base.formFields.map((c) => (c.nome === "nome" ? { ...c, obbligatorio: false } : c)) };
  assert.match(funnelSchema.safeParse(facoltativo).error!.issues[0].message, /obbligatorio/);
  const doppio = { ...base, formFields: [...base.formFields, base.formFields[2]] };
  assert.match(funnelSchema.safeParse(doppio).error!.issues[0].message, /ripetuto/);
  const senzaForm = { ...base, steps: base.steps.filter((s) => s.tipo !== "FORM") };
  assert.match(funnelSchema.safeParse(senzaForm).error!.issues[0].message, /non raccoglie lead/);
  const sceltaVuota = { ...base, formFields: [...base.formFields, { nome: "colore", etichetta: "Colore", tipo: "scelta" as const, obbligatorio: false, opzioni: [] }] };
  assert.match(funnelSchema.safeParse(sceltaVuota).error!.issues[0].message, /opzione/);
});

test("editor: passi rinumerati ed email riordinate al salvataggio", () => {
  const base = daModello("prova-mare");
  const r = funnelSchema.parse({ ...base, steps: [...base.steps].reverse(), emails: [...base.emails].reverse() });
  assert.deepEqual(r.steps.map((s) => s.ordine), [1, 2, 3, 4, 5]);
  assert.deepEqual(r.emails.map((e) => e.giorno), [0, 2, 7]);
});

test("nome tecnico dei campi nuovi", () => {
  assert.equal(nomeCampo("Lunghezza barca (m)"), "lunghezzaBarcaM");
  assert.equal(nomeCampo("Città di partenza"), "cittaDiPartenza");
  assert.equal(nomeCampo("3 motori?"), "campo3Motori");
});

test("stati dei funnel: il Content Creator invia in revisione ma non pubblica", () => {
  assert.ok(canTransition("BOZZA", "REVISIONE", "CONTENT", "funnel"));
  assert.ok(!canTransition("BOZZA", "REVISIONE", "CONTENT", "campagna"));
  assert.ok(!canTransition("APPROVATO", "PUBBLICATO", "CONTENT", "funnel"));
  assert.equal(allowedTransitions("APPROVATO", "MARKETING", "funnel")[0].label, "Pubblica");
  assert.ok(funnelEditable("APPROVATO") && !funnelEditable("PUBBLICATO") && !funnelEditable("PAUSA"));
});
