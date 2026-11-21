import "server-only";
import { Pool, types as defaultTypes } from "pg";

const globalForDb = globalThis as unknown as { invoiceDbPool?: Pool };

/**
 * Per-pool type overrides for the app's own pooled client (better-auth uses its
 * own pool and is unaffected). node-postgres otherwise returns:
 *   - DATE columns (issue_date, due_date, paid_on) as JS `Date` objects, which
 *     crash server components that call `.slice()` / compare "YYYY-MM-DD".
 *   - bigint/numeric columns (total_paise, …) as strings, breaking arithmetic.
 * We normalize those at the driver boundary so callers always see ISO date
 * strings and JS numbers, matching the TS types in src/types/database.ts.
 */
function makeTypeOverrides(): {
  setTypeParser: (oid: number, format: any, parseFn?: any) => void;
  getTypeParser: (oid: number, format?: string) => any;
} {
  const custom: any = {
    _parsers: { ...(defaultTypes as any)._parsers },
    setTypeParser(oid: number, format: any, parseFn?: any) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this._parsers[oid] = parseFn;
    },
    getTypeParser(oid: number, format?: string) {
      return this._parsers[oid] || (defaultTypes as any).getTypeParser(oid, format);
    },
  };
  // DATE -> keep the "YYYY-MM-DD" text (timezone-independent, no Date object).
  custom.setTypeParser(1082, (v: string) => v);
  // int8 (bigint) and numeric -> JS number, matching TS `number` types.
  custom.setTypeParser(20, (v: string) => Number(v));
  custom.setTypeParser(1700, (v: string) => Number(v));
  return custom;
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return globalForDb.invoiceDbPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    max: 5,
    types: makeTypeOverrides(),
  });
}
