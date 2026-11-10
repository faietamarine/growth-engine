import type { LeadMagnetContent } from "@/types/lead-magnet";

/** Tutti i testi di un lead magnet in un file Markdown, da girare a grafici, agenzie o tipografia. */
export function lmToMarkdown(title: string, c: LeadMagnetContent, extra: { tipo: string; campagna?: string | null; stato: string }): string {
  const l: string[] = [];
  const h = (s: string) => l.push("", `## ${s}`, "");
  const li = (a: string[]) => a.forEach((x) => l.push(`- ${x}`));
  l.push(`# ${title}`, "", `Tipo: ${extra.tipo} · Stato: ${extra.stato}${extra.campagna ? ` · Campagna: ${extra.campagna}` : ""}`, "", `> ${c.sottotitolo}`);
  h("Promessa");
  l.push(c.promessa);
  h("Benefici");
  li(c.benefici);
  h("Obiezioni e risposte");
  c.obiezioni.forEach((o) => l.push(`- **${o.obiezione}** — ${o.risposta}`));
  h("Struttura del contenuto");
  c.struttura.forEach((s) => {
    l.push(`### ${s.titolo}`);
    li(s.punti);
    l.push("");
  });
  h("Landing page");
  l.push(`**Headline:** ${c.landing.headline}`, "", `**Sottotitolo:** ${c.landing.sottotitolo}`, "", "**Punti elenco:**");
  li(c.landing.bullet);
  l.push("", `**Pulsante:** ${c.landing.cta}`, "", `**Prova sociale:** ${c.landing.provaSociale}`, "", "**Domande frequenti:**");
  c.landing.faq.forEach((f) => l.push(`- **${f.domanda}** ${f.risposta}`));
  h("Annunci Meta");
  c.metaAds.forEach((m, i) => l.push(`### Variante ${String.fromCharCode(65 + i)}`, m.testoPrincipale, "", `Titolo: ${m.titolo}`, `Descrizione: ${m.descrizione}`, ""));
  h("Annunci Google");
  l.push("**Titoli (max 30 caratteri):**");
  li(c.googleAds.titoli);
  l.push("", "**Descrizioni (max 90 caratteri):**");
  li(c.googleAds.descrizioni);
  h("Email");
  l.push(`**Oggetto:** ${c.email.oggetto}`, `**Anteprima:** ${c.email.anteprima}`, "", c.email.testo);
  h("WhatsApp");
  li(c.whatsapp);
  h("Prompt per immagini");
  li(c.promptImmagini);
  h("Prompt per video");
  li(c.promptVideo);
  h("Checklist di pubblicazione");
  c.checklist.forEach((x) => l.push(`- [${x.fatto ? "x" : " "}] ${x.voce}`));
  l.push("", "_Segnaposto: {nome} = nome del contatto, {consulente} = chi lo segue._", "");
  return l.join("\n");
}
