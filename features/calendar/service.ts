import "server-only";
import { and, asc, eq, gte, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { assets, campaigns, events, tasks, users, type TaskStatus, type User } from "@/db/schema";
import { audit } from "@/lib/audit";
import { bloccoDipendenza, creaCiclo, inRitardo, type AttivitaInput } from "@/lib/calendar/logic";
import { dataItalia } from "@/lib/crm/nautilus";

export type Filtri = { campagna?: string; persona?: string; stato?: string; tipo?: string };

async function nomi() {
  const [u, c, e, t] = await Promise.all([
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.active, true)),
    db.select({ id: campaigns.id, name: campaigns.name, startDate: campaigns.startDate, endDate: campaigns.endDate, status: campaigns.status }).from(campaigns),
    db.select({ id: events.id, name: events.name }).from(events),
    db.select({ id: tasks.id, title: tasks.title, status: tasks.status, dueDate: tasks.dueDate, dependsOnId: tasks.dependsOnId }).from(tasks),
  ]);
  return { utenti: u, campagne: c, eventi: e, tutte: t };
}

export async function listTasks(f: Filtri, oggi = dataItalia(new Date())) {
  const where: SQL[] = [];
  if (f.campagna) where.push(eq(tasks.campaignId, f.campagna));
  if (f.persona) where.push(eq(tasks.assigneeId, f.persona));
  if (f.stato && f.stato !== "aperte") where.push(eq(tasks.status, f.stato as TaskStatus));
  if (f.tipo) where.push(eq(tasks.kind, f.tipo));
  const [rows, n] = await Promise.all([db.select().from(tasks).where(where.length ? and(...where) : undefined).orderBy(asc(tasks.dueDate), asc(tasks.createdAt)), nomi()]);
  const nomeU = new Map(n.utenti.map((u) => [u.id, u.name]));
  const nomeC = new Map(n.campagne.map((c) => [c.id, c.name]));
  const nomeE = new Map(n.eventi.map((e) => [e.id, e.name]));
  const perId = new Map(n.tutte.map((t) => [t.id, t]));
  const out = rows
    .filter((t) => f.stato !== "aperte" || t.status !== "FATTO")
    .map((t) => {
      const dip = t.dependsOnId ? perId.get(t.dependsOnId) : undefined;
      return {
        ...t,
        assigneeName: t.assigneeId ? (nomeU.get(t.assigneeId) ?? null) : null,
        campaignName: t.campaignId ? (nomeC.get(t.campaignId) ?? null) : null,
        eventName: t.eventId ? (nomeE.get(t.eventId) ?? null) : null,
        dipendenza: dip ?? null,
        bloccata: !!dip && dip.status !== "FATTO" && t.status !== "FATTO",
        inRitardo: inRitardo(t, oggi),
      };
    });
  return { rows: out, utenti: n.utenti, campagne: n.campagne, eventi: n.eventi };
}
export type TaskItem = Awaited<ReturnType<typeof listTasks>>["rows"][number];

/** Tutto ciò che ha una data nel mese: attività, eventi, partenze/fine campagne, scadenze asset. */
export async function calendarItems(da: string, a: string, f: Filtri) {
  const { rows } = await listTasks(f);
  const [ev, camp, as] = await Promise.all([
    db.select().from(events).where(and(gte(events.date, da), lte(events.date, a))),
    db.select().from(campaigns).where(or(and(gte(campaigns.startDate, da), lte(campaigns.startDate, a)), and(gte(campaigns.endDate, da), lte(campaigns.endDate, a)))),
    db.select().from(assets).where(and(gte(assets.dueDate, da), lte(assets.dueDate, a))),
  ]);
  type Voce = { data: string; tipo: "attivita" | "evento" | "campagna" | "asset"; titolo: string; href: string; tono: "neutral" | "info" | "warn" | "ok" | "danger" | "gold" | "aqua" };
  const voci: Voce[] = [];
  for (const t of rows) if (t.dueDate >= da && t.dueDate <= a) voci.push({ data: t.dueDate, tipo: "attivita", titolo: t.title, href: `/calendario/${t.id}`, tono: t.status === "FATTO" ? "ok" : t.inRitardo ? "danger" : "neutral" });
  // Con un filtro per persona o stato mostriamo solo le attività: gli altri elementi non hanno quei campi.
  const soloAttivita = !!(f.persona || f.stato || f.tipo);
  if (!soloAttivita) {
    for (const e of ev) if (!f.campagna || e.campaignId === f.campagna) voci.push({ data: e.date, tipo: "evento", titolo: `${e.time} ${e.name}`, href: `/eventi/${e.id}`, tono: "gold" });
    for (const c of camp) {
      if (f.campagna && c.id !== f.campagna) continue;
      if (c.startDate && c.startDate >= da && c.startDate <= a) voci.push({ data: c.startDate, tipo: "campagna", titolo: `Partenza: ${c.name}`, href: `/campagne/${c.id}`, tono: "info" });
      if (c.endDate && c.endDate >= da && c.endDate <= a) voci.push({ data: c.endDate, tipo: "campagna", titolo: `Fine: ${c.name}`, href: `/campagne/${c.id}`, tono: "info" });
    }
    for (const x of as) if (x.dueDate && x.status !== "PUBBLICATO" && (!f.campagna || x.campaignId === f.campagna)) voci.push({ data: x.dueDate, tipo: "asset", titolo: x.title, href: `/asset/${x.id}`, tono: "aqua" });
  }
  return voci;
}

export async function getTask(id: string) {
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!t) return null;
  const dip = t.dependsOnId ? await db.query.tasks.findFirst({ where: eq(tasks.id, t.dependsOnId) }) : null;
  const dipendenti = await db.select({ id: tasks.id, title: tasks.title, status: tasks.status }).from(tasks).where(eq(tasks.dependsOnId, id));
  return { task: t, dipendenza: dip ?? null, dipendenti };
}

async function controllaDipendenza(taskId: string | null, input: Pick<AttivitaInput, "dependsOnId" | "status">) {
  if (!input.dependsOnId) return;
  const tutte = await db.select({ id: tasks.id, dependsOnId: tasks.dependsOnId }).from(tasks);
  if (!tutte.some((t) => t.id === input.dependsOnId)) throw new Error("L'attività da cui dipende non esiste più.");
  if (creaCiclo(taskId, input.dependsOnId, tutte)) throw new Error("Dipendenza non valida: creerebbe un giro chiuso tra attività.");
  const dip = await db.query.tasks.findFirst({ where: eq(tasks.id, input.dependsOnId) });
  const blocco = bloccoDipendenza(input.status, dip);
  if (blocco) throw new Error(blocco);
}

export async function createTask(input: AttivitaInput, user: User) {
  await controllaDipendenza(null, input);
  const [row] = await db.insert(tasks).values(input).returning({ id: tasks.id });
  await audit(user, "attivita_creata", "attivita", row.id, input.title);
  return row.id;
}

export async function updateTask(id: string, input: AttivitaInput, user: User) {
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!t) throw new Error("Attività non trovata.");
  await controllaDipendenza(id, input);
  await riapriDipendenti(id, input.status);
  await db.update(tasks).set(input).where(eq(tasks.id, id));
  await audit(user, "attivita_modificata", "attivita", id, input.title);
}

/** Se un'attività FATTA torna indietro, chi ne dipende ed era già partito non è più coerente: lo impediamo. */
async function riapriDipendenti(id: string, to: TaskStatus) {
  if (to === "FATTO") return;
  const partiti = await db.select({ title: tasks.title }).from(tasks).where(and(eq(tasks.dependsOnId, id), or(eq(tasks.status, "IN_CORSO"), eq(tasks.status, "IN_REVISIONE"), eq(tasks.status, "FATTO"))));
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, id), columns: { status: true } });
  if (t?.status === "FATTO" && partiti.length) throw new Error(`Non si può riaprire: «${partiti[0].title}» dipende da questa ed è già avviata.`);
}

export async function setTaskStatus(id: string, to: TaskStatus, user: User) {
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!t) throw new Error("Attività non trovata.");
  const dip = t.dependsOnId ? await db.query.tasks.findFirst({ where: eq(tasks.id, t.dependsOnId) }) : null;
  const blocco = bloccoDipendenza(to, dip);
  if (blocco) throw new Error(blocco);
  await riapriDipendenti(id, to);
  await db.update(tasks).set({ status: to }).where(eq(tasks.id, id));
  await audit(user, "attivita_stato", "attivita", id, `${t.status} → ${to}`);
}

export async function deleteTask(id: string, user: User) {
  const t = await db.query.tasks.findFirst({ where: eq(tasks.id, id) });
  if (!t) throw new Error("Attività non trovata.");
  // Chi dipendeva da questa attività resta libero.
  await db.transaction(async (tx) => {
    await tx.update(tasks).set({ dependsOnId: null }).where(eq(tasks.dependsOnId, id));
    await tx.delete(tasks).where(eq(tasks.id, id));
  });
  await audit(user, "attivita_eliminata", "attivita", id, t.title);
}

export async function formOptions() {
  const n = await nomi();
  return { utenti: n.utenti, campagne: n.campagne.filter((c) => c.status !== "CONCLUSO"), eventi: n.eventi, attivita: n.tutte };
}
