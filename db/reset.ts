// Cancella il database locale (solo SQLite su file). Usato da "npm run db:reset".
import { rmSync } from "node:fs";

try {
  process.loadEnvFile(".env");
} catch {}
const url = process.env.DATABASE_URL ?? "file:./data/growth.db";
if (!url.startsWith("file:")) {
  console.error("db:reset funziona solo con il database locale (file:...). Per Turso cancella le tabelle dalla console.");
  process.exit(1);
}
const path = url.slice("file:".length);
for (const p of [path, `${path}-journal`, `${path}-wal`, `${path}-shm`]) rmSync(p, { force: true });
console.log("Database locale cancellato:", path);
