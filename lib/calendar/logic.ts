import { z } from "zod";
import { TASK_STATUS, type TaskStatus } from "@/lib/enums";
import { addDays, diffDays } from "@/lib/campaigns/generate";

/** Tipi di attività di produzione (colonna "kind"). */
export const TIPI_ATTIVITA = [
  { key: "campagna", nome: "Campagna" },
  { key: "lancio", nome: "Lancio" },
  { key: "post", nome: "Post social" },
  { key: "email", nome: "Email / WhatsApp" },
  { key: "asset", nome: "Creatività" },
  { key: "evento", nome: "Evento" },
] as const;
export const nomeTipoAttivita = (k: string) => TIPI_ATTIVITA.find((t) => t.key === k)?.nome ?? k;

export const attivitaSchema = z.object({
  title: z.string().trim().min(3, "Il titolo deve avere almeno 3 caratteri").max(160),
  kind: z.enum(TIPI_ATTIVITA.map((t) => t.key) as [string, ...string[]]),
  campaignId: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null),
  eventId: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null).default(""),
  assigneeId: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  status: z.enum(TASK_STATUS).default("DA_FARE"),
  dependsOnId: z.union([z.literal(""), z.string().uuid()]).transform((v) => v || null),
  notes: z.string().trim().max(2000).default(""),
});
export type AttivitaInput = z.output<typeof attivitaSchema>;

// ---------------------------------------------------------------------------
// Dipendenze

type TaskLite = { id: string; title: string; status: TaskStatus; dueDate: string; dependsOnId: string | null };

/**
 * Regola: un'attività che dipende da un'altra non può iniziare (IN_CORSO, IN_REVISIONE, FATTO)
 * finché quella da cui dipende non è FATTA. Restituisce il motivo del blocco, o null.
 */
export function bloccoDipendenza(to: TaskStatus, dipendenza: TaskLite | null | undefined): string | null {
  if (to === "DA_FARE" || !dipendenza) return null;
  if (dipendenza.status === "FATTO") return null;
  return `Prima va completata «${dipendenza.title}».`;
}

/** Una dipendenza non deve creare cicli (A dipende da B che dipende da A) né puntare a se stessa. */
export function creaCiclo(taskId: string | null, dependsOnId: string | null, tutte: Pick<TaskLite, "id" | "dependsOnId">[]): boolean {
  if (!dependsOnId) return false;
  if (taskId && dependsOnId === taskId) return true;
  const mappa = new Map(tutte.map((t) => [t.id, t.dependsOnId]));
  const visti = new Set<string>();
  let cur: string | null | undefined = dependsOnId;
  while (cur) {
    if (cur === taskId) return true;
    if (visti.has(cur)) return true; // ciclo già presente: meglio rifiutare
    visti.add(cur);
    cur = mappa.get(cur) ?? null;
  }
  return false;
}

/** Avviso (non blocco): la scadenza cade prima di quella dell'attività da cui dipende. */
export function scadenzaIncoerente(dueDate: string, dipendenza: TaskLite | null | undefined) {
  return !!dipendenza && dueDate < dipendenza.dueDate;
}

// ---------------------------------------------------------------------------
// Calendario mensile

/** "2026-11" valido, altrimenti il mese di oggi. */
export function meseValido(m: string | undefined, oggi: string) {
  return m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : oggi.slice(0, 7);
}

export function meseVicino(mese: string, delta: number) {
  const [y, m] = mese.split("-").map(Number);
  const t = y * 12 + (m - 1) + delta;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/** Griglia del mese a settimane intere, da lunedì a domenica (giorni fuori mese inclusi per riempire). */
export function grigliaMese(mese: string): { data: string; nelMese: boolean }[][] {
  const primo = `${mese}-01`;
  const [y, m] = mese.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = domenica
  const inizio = addDays(primo, -((wd + 6) % 7));
  const giorniMese = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const ultimo = `${mese}-${String(giorniMese).padStart(2, "0")}`;
  const wdUltimo = new Date(Date.UTC(y, m - 1, giorniMese)).getUTCDay();
  const fine = addDays(ultimo, (7 - wdUltimo) % 7); // domenica della settimana dell'ultimo giorno
  const settimane: { data: string; nelMese: boolean }[][] = [];
  for (let d = inizio; d <= fine; d = addDays(d, 1)) {
    if (!settimane.length || settimane.at(-1)!.length === 7) settimane.push([]);
    settimane.at(-1)!.push({ data: d, nelMese: d.slice(0, 7) === mese });
  }
  return settimane;
}

// ---------------------------------------------------------------------------
// Timeline per campagna (diagramma a barre nel tempo)

export type BarraTimeline = { inizio: string; fine: string; left: number; width: number };

/** Posizione percentuale di un intervallo dentro la finestra [da, a] (estremi inclusi). */
export function barra(inizio: string, fine: string, da: string, a: string): BarraTimeline | null {
  if (fine < da || inizio > a) return null;
  const tot = diffDays(a, da) + 1;
  const i = inizio < da ? da : inizio;
  const f = fine > a ? a : fine;
  return { inizio, fine, left: (diffDays(i, da) / tot) * 100, width: ((diffDays(f, i) + 1) / tot) * 100 };
}

export const inRitardo = (t: { status: TaskStatus; dueDate: string }, oggi: string) => t.status !== "FATTO" && t.dueDate < oggi;
