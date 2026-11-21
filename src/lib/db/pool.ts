import "server-only";
import { Pool } from "pg";

const globalForDb = globalThis as unknown as { invoiceDbPool?: Pool };

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return globalForDb.invoiceDbPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    max: 5,
  });
}
