import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env");
} catch {
  /* .env facoltativo: valgono le variabili di sistema */
}

// DATABASE_URL:
//  - locale gratuito:  file:./data/growth.db   (SQLite, nessun account)
//  - online gratuito:  libsql://<nome>.turso.io + DATABASE_AUTH_TOKEN (Turso, piano free)
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: process.env.DATABASE_URL?.startsWith("libsql://") ? "turso" : "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/growth.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
