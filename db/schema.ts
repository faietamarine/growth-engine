import { type AnySQLiteColumn, sqliteTable, text, integer, real, index, uniqueIndex, blob } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import type { CampaignPlan } from "@/types/campaign";
import type { LeadMagnetContent } from "@/types/lead-magnet";
import type { AbTest, Blocco } from "@/types/landing";
import { ROLES, WORK_STATUS, ASSET_STATUS, TASK_STATUS, REPARTI, CHANNELS, LEAD_STATUS, FUNNEL_STEP_TIPI } from "@/lib/enums";
export * from "@/lib/enums";


/* ============================================================================
   Modello dati di Nautica Growth Engine.
   Regola d'oro: questa app PRODUCE lead e li consegna a Nautilus EVO.
   Non contiene pipeline commerciale (trattative, preventivi, vendite).
   I campi JSON sono salvati come testo (mode "json") per restare compatibili
   sia con SQLite/libSQL sia con un futuro passaggio a PostgreSQL.
   ============================================================================ */

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date());
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date());








export const users = sqliteTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ROLES }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: createdAt(),
});

export type { CampaignPlan } from "@/types/campaign";

export const campaigns = sqliteTable(
  "campaigns",
  {
    id: id(),
    name: text("name").notNull(),
    objective: text("objective").notNull(),
    reparto: text("reparto", { enum: REPARTI }).notNull().default("VENDITA"),
    brand: text("brand"), // slug del marchio (lib/brands/catalog.ts), facoltativo
    status: text("status", { enum: WORK_STATUS }).notNull().default("BOZZA"),
    startDate: text("start_date"), // AAAA-MM-GG
    endDate: text("end_date"),
    budget: real("budget").notNull().default(0),
    spent: real("spent").notNull().default(0),
    leadTarget: integer("lead_target").notNull().default(0),
    utmCampaign: text("utm_campaign").notNull(),
    plan: text("plan", { mode: "json" }).$type<CampaignPlan>().notNull(),
    ownerId: text("owner_id").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("campaigns_utm_idx").on(t.utmCampaign), index("campaigns_status_idx").on(t.status)],
);

export type FunnelStep = { ordine: number; tipo: (typeof FUNNEL_STEP_TIPI)[number]; titolo: string; descrizione?: string };
export type FunnelEmail = { giorno: number; oggetto: string; testo: string };
export type FunnelWhatsapp = { momento: string; testo: string };
export type FormField = { nome: string; etichetta: string; tipo: "testo" | "email" | "telefono" | "scelta" | "numero" | "area"; obbligatorio: boolean; opzioni?: string[] };

export const funnels = sqliteTable("funnels", {
  id: id(),
  name: text("name").notNull(),
  isTemplate: integer("is_template", { mode: "boolean" }).notNull().default(false),
  templateKey: text("template_key"),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  status: text("status", { enum: WORK_STATUS }).notNull().default("BOZZA"),
  objective: text("objective").notNull().default(""),
  audience: text("audience").notNull().default(""),
  promise: text("promise").notNull().default(""),
  steps: text("steps", { mode: "json" }).$type<FunnelStep[]>().notNull().default(sql`'[]'`),
  formFields: text("form_fields", { mode: "json" }).$type<FormField[]>().notNull().default(sql`'[]'`),
  qualificationRules: text("qualification_rules", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  reparto: text("reparto", { enum: REPARTI }).notNull().default("VENDITA"),
  leadMagnet: text("lead_magnet").notNull().default(""),
  cta: text("cta").notNull().default(""),
  emails: text("emails", { mode: "json" }).$type<FunnelEmail[]>().notNull().default(sql`'[]'`),
  whatsapp: text("whatsapp", { mode: "json" }).$type<FunnelWhatsapp[]>().notNull().default(sql`'[]'`),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const leadMagnets = sqliteTable("lead_magnets", {
  id: id(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  status: text("status", { enum: WORK_STATUS }).notNull().default("BOZZA"),
  content: text("content", { mode: "json" }).$type<LeadMagnetContent>().notNull(),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const landingPages = sqliteTable("landing_pages", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  funnelId: text("funnel_id").references(() => funnels.id, { onDelete: "set null" }),
  leadMagnetId: text("lead_magnet_id").references(() => leadMagnets.id, { onDelete: "set null" }),
  reparto: text("reparto", { enum: REPARTI }).notNull().default("VENDITA"),
  status: text("status", { enum: WORK_STATUS }).notNull().default("BOZZA"),
  /** Bozza in lavorazione nell'editor. */
  blocks: text("blocks", { mode: "json" }).$type<Blocco[]>().notNull().default(sql`'[]'`),
  /** Versione online: cambia solo con "Pubblica". Così la bozza si modifica senza toccare il sito. */
  publishedBlocks: text("published_blocks", { mode: "json" }).$type<Blocco[]>(),
  tracking: text("tracking", { mode: "json" }).$type<Record<string, string>>().notNull().default(sql`'{}'`),
  abTest: text("ab_test", { mode: "json" }).$type<AbTest>(),
  version: integer("version").notNull().default(0),
  visits: integer("visits").notNull().default(0), // visite variante A (o totali senza test)
  visitsB: integer("visits_b").notNull().default(0),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  /** Pagina di registrazione di un evento: i lead che arrivano da qui vengono collegati all'evento. */
  eventId: text("event_id").references((): AnySQLiteColumn => events.id, { onDelete: "set null" }),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const events = sqliteTable("events", {
  id: id(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  date: text("date").notNull(), // AAAA-MM-GG
  time: text("time").notNull().default("10:00"), // HH:MM inizio
  endTime: text("end_time").notNull().default("18:00"),
  venue: text("venue").notNull(),
  capacity: integer("capacity").notNull().default(0),
  budget: real("budget").notNull().default(0),
  spent: real("spent").notNull().default(0),
  objective: text("objective").notNull().default(""),
  notes: text("notes").notNull().default(""),
  /** Voci della checklist logistica spuntate (testo della voce → fatto). */
  checklist: text("checklist", { mode: "json" }).$type<Record<string, boolean>>().notNull().default(sql`'{}'`),
  status: text("status", { enum: WORK_STATUS }).notNull().default("BOZZA"),
  ownerId: text("owner_id").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const assets = sqliteTable("assets", {
  id: id(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  status: text("status", { enum: ASSET_STATUS }).notNull().default("IDEA"),
  version: integer("version").notNull().default(1),
  authorId: text("author_id").references(() => users.id),
  dueDate: text("due_date"),
  notes: text("notes").notNull().default(""),
  aiPrompt: text("ai_prompt").notNull().default(""),
  fileUrl: text("file_url"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const tasks = sqliteTable(
  "tasks",
  {
    id: id(),
    title: text("title").notNull(),
    kind: text("kind").notNull(), // campagna, evento, lancio, email, post, asset
    campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
    assigneeId: text("assignee_id").references(() => users.id),
    dueDate: text("due_date").notNull(),
    status: text("status", { enum: TASK_STATUS }).notNull().default("DA_FARE"),
    dependsOnId: text("depends_on_id"),
    eventId: text("event_id").references(() => events.id, { onDelete: "cascade" }),
    notes: text("notes").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("tasks_due_idx").on(t.dueDate)],
);

export type LeadConsents = {
  privacy: boolean; // obbligatorio per salvare il lead
  marketing: boolean;
  profilazione: boolean;
  testoInformativa: string; // versione dell'informativa accettata
  il: string; // ISO
  ip?: string;
};

export type LeadUtm = { source?: string; medium?: string; campaign?: string; content?: string; term?: string };

export const leads = sqliteTable(
  "leads",
  {
    id: id(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull().default(""),
    company: text("company").notNull().default(""),
    phone: text("phone").notNull(),
    email: text("email").notNull().default(""),
    interest: text("interest").notNull().default(""),
    budget: real("budget"),
    zone: text("zone").notNull().default(""),
    timeframe: text("timeframe").notNull().default(""),
    message: text("message").notNull().default(""),
    answers: text("answers", { mode: "json" }).$type<Record<string, string>>().notNull().default(sql`'{}'`),
    channel: text("channel", { enum: CHANNELS }).notNull().default("SITO"),
    sourceLabel: text("source_label").notNull().default(""), // es. "Landing prova in mare"
    utm: text("utm", { mode: "json" }).$type<LeadUtm>().notNull().default(sql`'{}'`),
    consents: text("consents", { mode: "json" }).$type<LeadConsents>().notNull(),
    reparto: text("reparto", { enum: REPARTI }).notNull().default("VENDITA"),
    score: integer("score").notNull().default(0),
    status: text("status", { enum: LEAD_STATUS }).notNull().default("NUOVO"),
    campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
    landingPageId: text("landing_page_id").references(() => landingPages.id, { onDelete: "set null" }),
    eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
    variant: text("variant", { enum: ["A", "B"] }),
    /** Evento: presenza registrata all'ingresso, e lead raccolto direttamente sul posto (non iscritto prima). */
    checkedInAt: integer("checked_in_at", { mode: "timestamp_ms" }),
    onSite: integer("on_site", { mode: "boolean" }).notNull().default(false),
    deliveredAt: integer("delivered_at", { mode: "timestamp_ms" }),
    deliveryBatch: text("delivery_batch"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("leads_status_idx").on(t.status), index("leads_created_idx").on(t.createdAt), index("leads_campaign_idx").on(t.campaignId)],
);

/** Ogni consegna (export verso Nautilus EVO o invio webhook) resta tracciata. */
export const leadDeliveries = sqliteTable("lead_deliveries", {
  id: id(),
  batch: text("batch").notNull(),
  method: text("method", { enum: ["EXPORT_NAUTILUS", "EXPORT_CSV", "WEBHOOK"] }).notNull(),
  leadCount: integer("lead_count").notNull(),
  status: text("status", { enum: ["OK", "ERRORE", "IN_CODA"] }).notNull(),
  error: text("error"),
  userId: text("user_id").references(() => users.id),
  createdAt: createdAt(),
});

/** Configurazione unica (riga id = "crm"). Il webhook resta pronto per quando Nautilus EVO avrà un server. */
export const crmConfig = sqliteTable("crm_config", {
  id: text("id").primaryKey(),
  mode: text("mode", { enum: ["EXPORT", "WEBHOOK"] }).notNull().default("EXPORT"),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  minScore: integer("min_score").notNull().default(40),
  updatedAt: updatedAt(),
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    userId: text("user_id"),
    userName: text("user_name").notNull().default("sistema"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    detail: text("detail").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type Funnel = typeof funnels.$inferSelect;
export type LeadMagnet = typeof leadMagnets.$inferSelect;
export type LandingPage = typeof landingPages.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Asset = typeof assets.$inferSelect;

/** Impostazioni chiave → valore (es. "sito": dati azienda, informativa, pixel). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
  updatedAt: updatedAt(),
});


/* ============================================================================
   Vetrina pubblica: foto dei mezzi (salvate nel database, già compresse dal browser)
   e annunci inseriti a mano.
   ============================================================================ */
export const media = sqliteTable("media", {
  id: id(),
  mime: text("mime").notNull(),
  data: blob("data", { mode: "buffer" }).notNull(),
  size: integer("size").notNull(),
  createdAt: createdAt(),
});

export const vehicles = sqliteTable(
  "vehicles",
  {
    id: id(),
    marca: text("marca").notNull(), // slug di lib/brands/catalog
    modello: text("modello").notNull(),
    categoria: text("categoria").notNull(), // GOMMONE, OPEN, ...
    condizione: text("condizione").notNull(), // PRONTA_CONSEGNA, DA_ORDINARE, USATO
    stato: text("stato").notNull().default("BOZZA"), // BOZZA, PUBBLICATO, VENDUTO
    anno: integer("anno"),
    prezzo: integer("prezzo"), // euro; vuoto = "su richiesta"
    lunghezza: real("lunghezza"), // metri
    motore: text("motore").notNull().default(""),
    ore: integer("ore"),
    posti: integer("posti"),
    descrizione: text("descrizione").notNull().default(""),
    dotazioni: text("dotazioni", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    foto: text("foto", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`), // id in media, la prima è la copertina
    inEvidenza: integer("in_evidenza", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("vehicles_stato_idx").on(t.stato, t.condizione), index("vehicles_marca_idx").on(t.marca)],
);
export type Vehicle = typeof vehicles.$inferSelect;
