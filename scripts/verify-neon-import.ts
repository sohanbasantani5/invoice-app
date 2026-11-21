/** Compare backed-up rows with Neon without printing customer data. */
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import pg from "pg";

const root = resolve(process.argv[2] ?? "");
if (!process.argv[2] || !process.env.DATABASE_URL) throw new Error("Pass backup directory and DATABASE_URL");
const tables = ["profiles", "clients", "items", "invoices", "invoice_items", "payments", "invoice_counters", "gmail_connections"] as const;
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  if (typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value)) return JSON.stringify(new Date(value).toISOString());
  return JSON.stringify(value);
};
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
await db.connect();
try {
  for (const table of tables) {
    const source = JSON.parse(await readFile(join(root, `${table}.json`), "utf8")) as Record<string, unknown>[];
    const { rows: target } = await db.query(`select row_to_json(t) as row from public.${table} t`);
    if (source.length !== target.length) throw new Error(`${table}: count mismatch`);
    const key = table === "profiles" || table === "gmail_connections" ? (r: Record<string, unknown>) => String(r.user_id)
      : table === "invoice_counters" ? (r: Record<string, unknown>) => `${r.user_id}/${r.financial_year}`
      : (r: Record<string, unknown>) => String(r.id);
    const byId = new Map(target.map(({ row }) => [key(row), row]));
    for (const row of source) {
      const restored = byId.get(key(row));
      if (!restored) throw new Error(`${table}: missing key`);
      for (const [column, value] of Object.entries(row)) {
        if (canonical(value) !== canonical(restored[column])) throw new Error(`${table}: value mismatch in ${column}`);
      }
    }
    console.log(`${table}: ${source.length} rows, keys and source columns match`);
  }
  const users = JSON.parse(await readFile(join(root, "auth-users.json"), "utf8")) as { id: string }[];
  const { rows: ids } = await db.query("select id from auth.users");
  if (canonical(users.map((u) => u.id).sort()) !== canonical(ids.map((u) => u.id).sort())) throw new Error("auth.users UUID mismatch");
  console.log(`auth.users: ${users.length} UUIDs match`);
} finally {
  await db.end();
}
