import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { settings, type User } from "@/db/schema";
import { audit } from "@/lib/audit";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import type { SiteSettings } from "@/types/landing";

export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, "sito") });
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<SiteSettings>) ?? {}) };
}

export async function saveSiteSettings(s: SiteSettings, user: User) {
  const prima = await getSiteSettings();
  // Se il testo dell'informativa cambia e la versione no, la versione si aggiorna da sola:
  // ogni lead registra la versione che ha accettato.
  const versione = s.informativa !== prima.informativa && s.versioneInformativa === prima.versioneInformativa ? `v-${new Date().toISOString().slice(0, 10)}` : s.versioneInformativa;
  const valore = { ...s, versioneInformativa: versione };
  await db
    .insert(settings)
    .values({ key: "sito", value: valore })
    .onConflictDoUpdate({ target: settings.key, set: { value: valore } });
  await audit(user, "impostazioni", "settings", "sito", versione !== prima.versioneInformativa ? `informativa ${versione}` : "dati aggiornati");
  return valore;
}
