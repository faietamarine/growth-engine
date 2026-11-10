/* Dati demo realistici (Abruzzo, Faieta Marine). Avvio: npm run db:seed
   Le date sono relative a oggi, così la dashboard è sempre "viva".
   Tutti i nominativi e i numeri di telefono sono inventati. */
try {
  process.loadEnvFile(".env");
} catch {}

import bcrypt from "bcryptjs";
import { db } from "./client";
import * as s from "./schema";
import { scoreLead, isQualified } from "@/lib/leads/score";
import { dataItalia } from "@/lib/crm/nautilus";
import { generateCampaign } from "@/lib/campaigns/generate";
import { getTemplate } from "@/lib/funnels/templates";
import { generateLeadMagnet } from "@/lib/leadmagnets/generate";
import { bloccoIniziali } from "@/lib/landing/blocks";
import { eq } from "drizzle-orm";
import { tipoOrDefault } from "@/lib/events/catalog";
import { blocchiIscrizione } from "@/lib/events/logic";

let seedState = 20261109;
const rnd = () => ((seedState = (seedState * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const giorni = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};
const iso = (n: number) => dataItalia(giorni(n));

async function main() {
  const gia = await db.select().from(s.users).limit(1);
  if (gia.length) {
    console.log("Il database contiene già dati: per ripartire da zero usa  npm run db:reset");
    return;
  }

  const pass = await bcrypt.hash(process.env.SEED_PASSWORD || "nautica2026", 10);
  const [marco, chiara, luca, sara] = await db
    .insert(s.users)
    .values([
      { name: "Marco", email: "marco@faietamarine.it", passwordHash: pass, role: "ADMIN" },
      { name: "Chiara (demo)", email: "marketing@faietamarine.it", passwordHash: pass, role: "MARKETING" },
      { name: "Luca (demo)", email: "contenuti@faietamarine.it", passwordHash: pass, role: "CONTENT" },
      { name: "Sara (demo)", email: "eventi@faietamarine.it", passwordHash: pass, role: "EVENT" },
    ])
    .returning();

  // Le campagne demo passano dal generatore vero: così i piani sono completi e coerenti.
  const oggi = iso(0);
  const crea = (o: {
    obiettivo: string;
    inizio: number;
    durata: number;
    budget: number;
    leadTarget?: number;
    utm: string;
    status: s.WorkStatus;
    spent: number;
    owner: string;
    nome?: string;
  }) => {
    const g = generateCampaign({ obiettivo: o.obiettivo, dataInizio: iso(o.inizio), durataGiorni: o.durata, budget: o.budget, leadTarget: o.leadTarget, oggi });
    return { name: o.nome ?? g.name, objective: g.objective, reparto: g.reparto, status: o.status, startDate: g.startDate, endDate: g.endDate, budget: g.budget, spent: o.spent, leadTarget: g.leadTarget, utmCampaign: o.utm, ownerId: o.owner, plan: g.plan };
  };
  const camp = await db
    .insert(s.campaigns)
    .values([
      crea({ obiettivo: "Generare richieste di prova in mare per gommoni Joker Boat 6–8 m", nome: "Prova in mare gommoni Joker Boat — Primavera 2027", inizio: -30, durata: 90, budget: 2400, leadTarget: 40, utm: "prova-mare-joker-2027", status: "PUBBLICATO", spent: 1150, owner: chiara.id }),
      crea({ obiettivo: "Recuperare proprietari di barche per tagliando e varo di primavera", nome: "Tagliando e varo di primavera 2027", inizio: -20, durata: 110, budget: 900, leadTarget: 60, utm: "tagliando-primavera-2027", status: "PUBBLICATO", spent: 310, owner: chiara.id }),
      crea({ obiettivo: "Promuovere l'open day in marina con prove in mare e novità Capelli e Yamaha", nome: "Open Day Marina di Pescara — Aprile 2027", inizio: 10, durata: 140, budget: 4500, leadTarget: 80, utm: "open-day-pescara-2027", status: "REVISIONE", spent: 0, owner: sara.id }),
      crea({ obiettivo: "Generare richieste di valutazione per permuta", nome: "Valuta la tua barca in permuta", inizio: -45, durata: 90, budget: 1200, leadTarget: 30, utm: "valutazione-permuta", status: "PUBBLICATO", spent: 870, owner: chiara.id }),
      crea({ obiettivo: "Acquisire lead per noleggio estivo di gommoni senza patente", nome: "Noleggio estate 2027 senza patente", inizio: 120, durata: 120, budget: 1500, leadTarget: 50, utm: "noleggio-estate-2027", status: "BOZZA", spent: 0, owner: chiara.id }),
    ])
    .returning();
  const [cJoker, cTagliando, cOpenDay, cPermuta, cNoleggio] = camp;

  // Funnel demo creati dai modelli della libreria, collegati alle campagne.
  const daModello = (key: string, c: s.Campaign, status: s.WorkStatus, owner: string) => {
    const t = getTemplate(key)!;
    return {
      name: `${t.nome} — ${c.name}`.slice(0, 120),
      templateKey: t.key,
      campaignId: c.id,
      status,
      reparto: c.reparto,
      objective: t.obiettivo,
      audience: c.plan.audience.map((a) => a.nome).join(", "),
      promise: c.plan.promessa,
      leadMagnet: t.leadMagnet,
      cta: c.plan.cta,
      steps: t.steps,
      formFields: t.form,
      emails: t.emails,
      whatsapp: t.whatsapp,
      qualificationRules: c.plan.qualificazione,
      ownerId: owner,
    };
  };
  const [fJoker, fTagliando, fPermuta, fOpenDay] = await db
    .insert(s.funnels)
    .values([
      daModello("prova-mare", cJoker, "PUBBLICATO", chiara.id),
      daModello("checklist-manutenzione", cTagliando, "PUBBLICATO", chiara.id),
      daModello("permuta", cPermuta, "PUBBLICATO", chiara.id),
      daModello("open-day", cOpenDay, "BOZZA", sara.id),
    ])
    .returning();

  // Lead magnet demo: checklist del tagliando già pubblicata, prova in mare Joker in revisione.
  const lmCheck = generateLeadMagnet({ tipo: "checklist", tema: "la tua barca" }).content;
  const lmProva = generateLeadMagnet({ tipo: "prova-mare", tema: "gommoni Joker Boat" }).content;
  const [lmCheckRow, lmProvaRow] = await db.insert(s.leadMagnets).values([
    { type: "checklist", title: lmCheck.titolo, campaignId: cTagliando.id, status: "PUBBLICATO", content: { ...lmCheck, checklist: lmCheck.checklist.map((x) => ({ ...x, fatto: true })) }, ownerId: luca.id },
    { type: "prova-mare", title: lmProva.titolo, campaignId: cJoker.id, status: "REVISIONE", content: { ...lmProva, checklist: lmProva.checklist.map((x, i) => ({ ...x, fatto: i < 4 })) }, ownerId: luca.id },
  ]).returning();

  // Landing demo: bozza costruita da funnel, lead magnet e campagna, come fa l'app.
  const pagina = (title: string, c: s.Campaign, f: (typeof fJoker), lm: s.LeadMagnet | null) =>
    bloccoIniziali({
      titolo: title,
      funnel: { promise: f.promise, cta: f.cta, formFields: f.formFields, steps: f.steps, leadMagnet: f.leadMagnet },
      leadMagnet: lm?.content ?? null,
      campagna: { promessa: c.plan.promessa, cta: c.plan.cta, offerta: c.plan.offerta, hook: c.plan.hook },
    });
  const bJoker = pagina("Richiedi una prova in mare", cJoker, fJoker, lmProvaRow);
  const bTagliando = pagina("Prenota il tagliando di primavera", cTagliando, fTagliando, lmCheckRow);
  const bPermuta = pagina("Valuta la tua barca in permuta", cPermuta, fPermuta, null);
  const [lJoker, lTagliando, lPermuta] = await db
    .insert(s.landingPages)
    .values([
      { slug: "prova-in-mare-joker", title: "Richiedi una prova in mare", campaignId: cJoker.id, funnelId: fJoker.id, leadMagnetId: lmProvaRow.id, reparto: "VENDITA", status: "PUBBLICATO", blocks: bJoker, publishedBlocks: bJoker, version: 1, visits: 1240, publishedAt: giorni(-29), ownerId: chiara.id },
      { slug: "tagliando-primavera", title: "Prenota il tagliando di primavera", campaignId: cTagliando.id, funnelId: fTagliando.id, leadMagnetId: lmCheckRow.id, reparto: "SERVICE", status: "PUBBLICATO", blocks: bTagliando, publishedBlocks: bTagliando, version: 1, visits: 610, publishedAt: giorni(-19), ownerId: chiara.id },
      { slug: "valuta-la-tua-barca", title: "Valuta la tua barca in permuta", campaignId: cPermuta.id, funnelId: fPermuta.id, reparto: "VENDITA", status: "PUBBLICATO", blocks: bPermuta, publishedBlocks: bPermuta, version: 1, visits: 980, publishedAt: giorni(-44), ownerId: chiara.id },
      { slug: "open-day-pescara", title: "Open Day in marina", campaignId: cOpenDay.id, funnelId: fOpenDay.id, reparto: "VENDITA", status: "REVISIONE", blocks: pagina("Open Day in marina", cOpenDay, fOpenDay, null), ownerId: sara.id },
    ])
    .returning();
  const landingDi = new Map([
    [cJoker.id, lJoker.id],
    [cTagliando.id, lTagliando.id],
    [cPermuta.id, lPermuta.id],
  ]);

  // Eventi demo: uno in preparazione, uno con iscrizioni aperte, uno già svolto (con presenze e contatti sul posto).
  const tOpen = tipoOrDefault("open-day");
  const [eOpenDay, eOrtona, ePresentazione] = await db
    .insert(s.events)
    .values([
      { name: "Open Day Marina di Pescara", type: "open-day", campaignId: cOpenDay.id, date: iso(150), time: "10:00", endTime: "19:00", venue: "Porto Turistico Marina di Pescara", capacity: 200, budget: 3200, objective: "80 lead, 25 prove in mare", status: "REVISIONE", ownerId: sara.id, checklist: { [tOpen.checklist[0]]: true, [tOpen.checklist[4]]: true } },
      { name: "Giornata prove in mare Ortona", type: "prova-mare", campaignId: cJoker.id, date: iso(21), time: "09:00", endTime: "17:30", venue: "Porto di Ortona", capacity: 24, budget: 450, spent: 120, objective: "24 prove, 8 trattative", status: "PUBBLICATO", ownerId: sara.id, checklist: Object.fromEntries(tipoOrDefault("prova-mare").checklist.slice(0, 3).map((v) => [v, true])) },
      { name: "Presentazione Joker Clubman 22", type: "presentazione-modello", campaignId: cJoker.id, date: iso(-12), time: "18:00", endTime: "21:00", venue: "Showroom Faieta Marine, Pescara", capacity: 40, budget: 900, spent: 850, objective: "Pre-ordini e prove in mare sul nuovo Clubman 22", status: "CONCLUSO", ownerId: sara.id, checklist: Object.fromEntries(tipoOrDefault("presentazione-modello").checklist.map((v) => [v, true])), notes: "Ottima affluenza dalle 19. Rinfresco sufficiente per 50 persone." },
    ])
    .returning();
  // La landing dell'Open Day (in revisione) è la sua pagina di iscrizione.
  await db.update(s.landingPages).set({ eventId: eOpenDay.id }).where(eq(s.landingPages.slug, "open-day-pescara"));
  const bOrtona = blocchiIscrizione(eOrtona);
  const bPres = blocchiIscrizione(ePresentazione);
  const [lOrtona, lPres] = await db
    .insert(s.landingPages)
    .values([
      { slug: "prove-in-mare-ortona", title: eOrtona.name, campaignId: cJoker.id, eventId: eOrtona.id, reparto: "VENDITA", status: "PUBBLICATO", blocks: bOrtona, publishedBlocks: bOrtona, version: 1, visits: 310, publishedAt: giorni(-9), ownerId: chiara.id },
      { slug: "presentazione-joker-clubman-22", title: ePresentazione.name, campaignId: cJoker.id, eventId: ePresentazione.id, reparto: "VENDITA", status: "CONCLUSO", blocks: bPres, publishedBlocks: bPres, version: 1, visits: 420, publishedAt: giorni(-30), ownerId: chiara.id },
    ])
    .returning();

  const taskRows = await db.insert(s.tasks).values([
    { title: "Carosello Meta: 5 gommoni Joker in navigazione", kind: "post", campaignId: cJoker.id, assigneeId: luca.id, dueDate: iso(1), status: "IN_CORSO" },
    { title: "Video verticale 30\" prova in mare", kind: "asset", campaignId: cJoker.id, assigneeId: luca.id, dueDate: iso(3), status: "DA_FARE" },
    { title: "Email clienti 2024–2025: promemoria tagliando", kind: "email", campaignId: cTagliando.id, assigneeId: chiara.id, dueDate: iso(0), status: "IN_REVISIONE" },
    { title: "Messaggio WhatsApp tagliando (lista consensi)", kind: "email", campaignId: cTagliando.id, assigneeId: chiara.id, dueDate: iso(2), status: "DA_FARE" },
    { title: "Richiesta spazio banchina alla Marina", kind: "evento", campaignId: cOpenDay.id, assigneeId: sara.id, dueDate: iso(6), status: "IN_CORSO" },
    { title: "Pagina evento con registrazione e QR", kind: "lancio", campaignId: cOpenDay.id, assigneeId: chiara.id, dueDate: iso(12), status: "DA_FARE" },
    { title: "Locandina A3 Open Day", kind: "asset", campaignId: cOpenDay.id, assigneeId: luca.id, dueDate: iso(18), status: "DA_FARE" },
    { title: "Annunci Google \"valutazione barca usata\"", kind: "campagna", campaignId: cPermuta.id, assigneeId: chiara.id, dueDate: iso(-2), status: "IN_CORSO" },
    { title: "Foto flotta noleggio 2027", kind: "asset", campaignId: cNoleggio.id, assigneeId: luca.id, dueDate: iso(25), status: "DA_FARE" },
    { title: "Report settimanale campagne", kind: "campagna", assigneeId: marco.id, dueDate: iso(4), status: "DA_FARE" },
    { title: "Testi landing prova in mare v2 (test A/B)", kind: "lancio", campaignId: cJoker.id, assigneeId: luca.id, dueDate: iso(-5), status: "FATTO" },
    { title: "Conferma turni agli iscritti – Ortona", kind: "email", campaignId: cJoker.id, eventId: eOrtona.id, assigneeId: sara.id, dueDate: iso(19), status: "DA_FARE" },
    { title: "Follow-up presentazione Clubman: preventivi", kind: "email", campaignId: cJoker.id, eventId: ePresentazione.id, assigneeId: marco.id, dueDate: iso(-9), status: "IN_CORSO" },
  ]).returning();
  // Dipendenze: la locandina aspetta la conferma dello spazio; il video aspetta il carosello.
  const tId = (t: string) => taskRows.find((x) => x.title.startsWith(t))!.id;
  await db.update(s.tasks).set({ dependsOnId: tId("Richiesta spazio banchina") }).where(eq(s.tasks.id, tId("Locandina A3")));
  await db.update(s.tasks).set({ dependsOnId: tId("Carosello Meta") }).where(eq(s.tasks.id, tId("Video verticale")));


  await db.insert(s.assets).values([
    { title: "Carosello gommoni Joker", type: "Carousel", campaignId: cJoker.id, status: "REVISIONE", authorId: luca.id, dueDate: iso(1), version: 2, fileUrl: "https://drive.google.com/drive/folders/demo-carosello-joker", notes: "5 slide: Clubman 22, Coaster 650, Mainstream 700, dettaglio consolle, invito alla prova in mare.", aiPrompt: "Gommone bianco 7 m in navigazione al tramonto sulla Costa dei Trabocchi, luce calda, ripresa dall'alto" },
    { title: "Video prova in mare 30\"", type: "Video", campaignId: cJoker.id, status: "BOZZA", authorId: luca.id, dueDate: iso(3), notes: "Verticale 9:16, prime 3 secondi con la barca che plana, sottotitoli sempre visibili." },
    { title: "Script video prova in mare", type: "Script video", campaignId: cJoker.id, status: "APPROVATO", authorId: luca.id, dueDate: iso(-1), notes: "0-3\" barca in planata · 3-10\" «Vuoi provarla prima di decidere?» · 10-25\" istruttore a bordo, cliente al timone · 25-30\" «Prenota la tua uscita» + logo." },
    { title: "Email promemoria tagliando", type: "Email", campaignId: cTagliando.id, status: "APPROVATO", authorId: chiara.id, dueDate: iso(0), notes: "Oggetto: La tua barca è pronta per la stagione?\n\nCiao, prenota ora il tagliando di primavera: i posti in officina di marzo e aprile si riempiono in fretta." },
    { title: "Locandina Open Day A3", type: "Flyer", campaignId: cOpenDay.id, status: "IDEA", authorId: luca.id, dueDate: iso(18) },
    { title: "Messaggio WhatsApp iscritti Ortona", type: "Messaggio WhatsApp", campaignId: cJoker.id, status: "BOZZA", authorId: sara.id, dueDate: iso(19), notes: "Ciao! Ti confermiamo la prova in mare a Ortona. Ti aspettiamo 15 minuti prima del tuo turno." },
    { title: "Annunci Google permuta (3 varianti)", type: "Testo pubblicitario", campaignId: cPermuta.id, status: "PUBBLICATO", authorId: chiara.id, version: 3, notes: "Valuta la tua barca in 24 ore · Permuta con barca nuova o usata · Stima gratuita e senza impegno" },
  ]);

  await db.insert(s.crmConfig).values({ id: "crm", mode: "EXPORT", minScore: 40 });

  // ---- Lead demo ----
  const nomi = ["Giuseppe", "Antonio", "Francesca", "Luca", "Marta", "Davide", "Elena", "Fabio", "Sara", "Paolo", "Giulia", "Matteo", "Roberta", "Andrea", "Simone", "Valentina", "Nicola", "Alessia"];
  const cognomi = ["Di Febo", "D'Alessandro", "Ciccone", "Marinelli", "Di Giacomo", "Del Re", "Pace", "Iezzi", "Tiberio", "Di Nisio", "Sciarra", "Verratti", "Cocco", "Di Lorenzo", "Ranieri", "Mancini"];
  const zone = ["Pescara", "Francavilla al Mare", "Ortona", "Vasto", "Montesilvano", "Giulianova", "Silvi", "Chieti", ""];
  const tempiV = ["Entro 3 mesi", "Entro 6 mesi", "Entro 12 mesi", "Sto solo guardando"];
  const tempiS = ["Urgente", "Entro il mese", "Prossima stagione"];

  type Def = { c: s.Campaign; n: number; interessi: string[]; canali: s.Channel[]; fonte: string; budget: [number, number] };
  const defs: Def[] = [
    { c: cJoker, n: 16, interessi: ["Joker Boat Clubman 22", "Joker Boat Coaster 650", "Joker Boat Mainstream 700", "Gommone 6–7 m con Yamaha 150 cv"], canali: ["META", "META", "GOOGLE", "WHATSAPP"], fonte: "Landing prova in mare", budget: [35000, 90000] },
    { c: cTagliando, n: 14, interessi: ["Capelli Tempest 570, tagliando 100 h", "Yamaha F115, tagliando annuale", "Gommone 6 m, antivegetativa e varo", "Jeanneau Cap Camarat 6.5, tagliando e impianto elettrico"], canali: ["EMAIL", "WHATSAPP", "META"], fonte: "Landing tagliando di primavera", budget: [0, 0] },
    { c: cPermuta, n: 10, interessi: ["Permuta Capelli Tempest 650 del 2016", "Permuta gommone 5,5 m + Yamaha 60 cv", "Permuta cabinato 7 m del 2012"], canali: ["GOOGLE", "GOOGLE", "META"], fonte: "Landing valutazione permuta", budget: [20000, 120000] },
  ];

  const leadRows: s.NewLead[] = [];
  let k = 0;
  for (const d of defs) {
    for (let i = 0; i < d.n; i++) {
      k++;
      const service = d.c.reparto === "SERVICE";
      const tempistica = pick(service ? tempiS : tempiV);
      const budget = service || rnd() < 0.25 ? undefined : Math.round((d.budget[0] + rnd() * (d.budget[1] - d.budget[0])) / 500) * 500;
      const email = rnd() < 0.8 ? `cliente${k}@esempio.it` : "";
      const marketing = rnd() < 0.6;
      const messaggio = rnd() < 0.5 ? "Vorrei capire tempi e disponibilità, possibilmente nel fine settimana." : "";
      const zona = pick(zone);
      const interesse = pick(d.interessi);
      const { score } = scoreLead({ reparto: d.c.reparto, email, interesse, budget, tempistica, zona, messaggio, consensoMarketing: marketing });
      const giorniFa = Math.floor(rnd() * 40);
      const creato = giorni(-giorniFa);
      const qual = isQualified(score, 40);
      // I lead più vecchi di 10 giorni e qualificati risultano già consegnati al CRM.
      const consegnato = qual && giorniFa > 10;
      const canale = pick(d.canali);
      leadRows.push({
        firstName: pick(nomi),
        lastName: pick(cognomi),
        // Numero demo: formato valido ma chiaramente fittizio (contiene "000").
        phone: `+39 3${Math.floor(20 + rnd() * 70)}000${String(1000 + k).slice(-4)}`,
        email,
        interest: interesse,
        budget: budget ?? null,
        zone: zona,
        timeframe: tempistica,
        message: messaggio,
        channel: canale,
        sourceLabel: d.fonte,
        utm: { source: canale === "META" ? "facebook" : canale.toLowerCase(), medium: canale === "META" || canale === "GOOGLE" ? "cpc" : canale.toLowerCase(), campaign: d.c.utmCampaign },
        consents: { privacy: true, marketing, profilazione: false, testoInformativa: "informativa-2026-10", il: creato.toISOString() },
        reparto: d.c.reparto,
        score,
        status: consegnato ? "CONSEGNATO" : qual ? "QUALIFICATO" : "NON_QUALIFICATO",
        campaignId: d.c.id,
        landingPageId: landingDi.get(d.c.id) ?? null,
        deliveredAt: consegnato ? giorni(-giorniFa + 2) : null,
        deliveryBatch: consegnato ? "DEMO-0001" : null,
        createdAt: creato,
        updatedAt: creato,
      });
    }
  }
  // Iscritti agli eventi (dalle pagine di iscrizione), presenze e contatti raccolti sul posto.
  const fasce = tipoOrDefault("prova-mare").fasceOrarie!;
  const iscritto = (ev: s.EventRow, landingId: string, giorniFa: number, opz: { presente?: boolean; sulPosto?: boolean; fascia?: boolean }) => {
    k++;
    const interesse = pick(tipoOrDefault(ev.type).interessi);
    const tempistica = pick(tempiV.slice(0, 3));
    const email = rnd() < 0.85 ? `cliente${k}@esempio.it` : "";
    const marketing = rnd() < 0.7;
    const budget = rnd() < 0.5 ? Math.round((30000 + rnd() * 50000) / 500) * 500 : undefined;
    const { score } = scoreLead({ reparto: "VENDITA", email, interesse, budget, tempistica, zona: pick(zone), messaggio: "", consensoMarketing: marketing, presenteEvento: !!(opz.presente || opz.sulPosto) });
    const qual = isQualified(score, 40);
    const creato = giorni(-giorniFa);
    const consegnato = qual && giorniFa > 10;
    const canale: s.Channel = opz.sulPosto ? "EVENTO" : pick<s.Channel>(["META", "WHATSAPP", "EMAIL"]);
    leadRows.push({
      firstName: pick(nomi),
      lastName: pick(cognomi),
      phone: `+39 3${Math.floor(20 + rnd() * 70)}000${String(1000 + k).slice(-4)}`,
      email,
      interest: interesse,
      budget: budget ?? null,
      timeframe: tempistica,
      answers: opz.fascia ? { "Fascia oraria preferita": pick(fasce) } : {},
      channel: canale,
      sourceLabel: opz.sulPosto ? `Evento: ${ev.name}` : `Iscrizione evento: ${ev.name}`,
      utm: opz.sulPosto ? { source: "evento", medium: "offline", campaign: cJoker.utmCampaign } : { source: canale === "META" ? "facebook" : canale.toLowerCase(), medium: canale === "META" ? "cpc" : canale.toLowerCase(), campaign: cJoker.utmCampaign },
      consents: { privacy: true, marketing, profilazione: false, testoInformativa: "informativa-2026-10", il: creato.toISOString() },
      reparto: "VENDITA",
      score,
      status: consegnato ? "CONSEGNATO" : qual ? "QUALIFICATO" : "NON_QUALIFICATO",
      campaignId: cJoker.id,
      landingPageId: opz.sulPosto ? null : landingId,
      eventId: ev.id,
      onSite: !!opz.sulPosto,
      checkedInAt: opz.presente || opz.sulPosto ? new Date(`${ev.date}T${ev.time}:00+01:00`) : null,
      deliveredAt: consegnato ? giorni(-giorniFa + 2) : null,
      deliveryBatch: consegnato ? "DEMO-0001" : null,
      createdAt: creato,
      updatedAt: creato,
    });
  };
  for (let i = 0; i < 14; i++) iscritto(eOrtona, lOrtona.id, Math.floor(rnd() * 9), { fascia: true });
  for (let i = 0; i < 18; i++) iscritto(ePresentazione, lPres.id, 13 + Math.floor(rnd() * 15), { presente: i < 12 });
  for (let i = 0; i < 6; i++) iscritto(ePresentazione, lPres.id, 12, { sulPosto: true });

  await db.insert(s.leads).values(leadRows);
  const consegnati = leadRows.filter((l) => l.status === "CONSEGNATO").length;
  await db.insert(s.leadDeliveries).values({ batch: "DEMO-0001", method: "EXPORT_NAUTILUS", leadCount: consegnati, status: "OK", userId: marco.id, createdAt: giorni(-8) });
  await db.insert(s.auditLogs).values({ userId: marco.id, userName: marco.name, action: "seed", entity: "sistema", detail: "Caricati i dati demo" });

  console.log(`Dati demo caricati: ${camp.length} campagne, 3 eventi, ${leadRows.length} lead (${consegnati} già consegnati).`);
  console.log("Accesso: marco@faietamarine.it" + (process.env.SEED_PASSWORD ? "" : " / nautica2026"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
