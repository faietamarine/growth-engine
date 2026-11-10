import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

// Un solo client per processo (in sviluppo Next ricarica i moduli: lo teniamo su globalThis).
const g = globalThis as unknown as { __ngeClient?: Client };

function makeClient() {
  const url = process.env.DATABASE_URL ?? "file:./data/growth.db";
  return createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
}

export const client = g.__ngeClient ?? makeClient();
if (process.env.NODE_ENV !== "production") g.__ngeClient = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
