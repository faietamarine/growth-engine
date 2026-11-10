import "server-only";
import { db } from "@/db/client";
import { auditLogs, type User } from "@/db/schema";

/** Registro delle azioni: chi, cosa, quando. Non blocca mai l'operazione principale. */
export async function audit(user: Pick<User, "id" | "name"> | null, action: string, entity: string, entityId?: string | null, detail = "") {
  try {
    await db.insert(auditLogs).values({ userId: user?.id ?? null, userName: user?.name ?? "sistema", action, entity, entityId: entityId ?? null, detail });
  } catch (e) {
    console.error("Audit non registrato:", e);
  }
}
