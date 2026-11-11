import "server-only";
import { ne } from "drizzle-orm";
import { db } from "@/db/client";
import { assets, auditLogs, campaigns, events, funnels, landingPages, leadDeliveries, leadMagnets, leads, tasks, users, type User } from "@/db/schema";

/** Parola da digitare per confermare: evita cancellazioni per errore. */
export const CONFERMA_RESET_DEMO = "ELIMINA DATI DEMO";

/**
 * Svuota i dati di esempio: campagne, funnel, landing, lead magnet, eventi, asset, attività,
 * lead, consegne, registro e tutti gli utenti tranne quello che esegue l'operazione.
 * Le impostazioni dell'azienda e la configurazione CRM restano. Tutto in una sola transazione:
 * se un passo fallisce, non cancella nulla.
 */
export async function svuotaDatiDemo(admin: User) {
  await db.transaction(async (tx) => {
    await tx.delete(leadDeliveries);
    await tx.delete(leads);
    await tx.delete(tasks);
    await tx.delete(assets);
    await tx.delete(events);
    await tx.delete(landingPages);
    await tx.delete(leadMagnets);
    await tx.delete(funnels);
    await tx.delete(campaigns);
    await tx.delete(auditLogs);
    await tx.delete(users).where(ne(users.id, admin.id));
  });
  // Dopo lo svuotamento il registro riparte da questa operazione.
  await db.insert(auditLogs).values({ userId: admin.id, userName: admin.name, action: "reset", entity: "database", entityId: null, detail: "dati demo eliminati" });
}
