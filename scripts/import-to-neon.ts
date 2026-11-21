/** Restore a completed local export into an EMPTY Neon database. */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, relative, isAbsolute, join } from "node:path";
import { createHash } from "node:crypto";
import pg from "pg";
import { put } from "@vercel/blob";

const backupArg = process.argv[2];
const skipBlob = process.argv.includes("--skip-blob");
if (!backupArg) throw new Error("Usage: node --env-file=.env.local --experimental-strip-types scripts/import-to-neon.ts <completed-backup-folder>");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const root = resolve(backupArg);
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const tables = ["profiles", "clients", "items", "invoices", "invoice_items", "payments", "invoice_counters", "gmail_connections"] as const;
const rows = new Map<string, Record<string, unknown>[]>();
for (const name of tables) {
  const bytes = await readFile(join(root, `${name}.json`));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const data = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>[];
  if (!Array.isArray(data) || data.length !== manifest.tables?.[name]?.count || sha256 !== manifest.tables?.[name]?.sha256)
    throw new Error(`Backup manifest mismatch: ${name}`);
  rows.set(name, data);
}
const users = JSON.parse(await readFile(join(root, "auth-users.json"), "utf8")) as Record<string, unknown>[];
if (!Array.isArray(users) || users.length !== manifest.users) throw new Error("Backup auth user count mismatch");

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
await db.connect();
try {
  for (const name of ["auth.users", ...tables.map((t) => `public.${t}`)]) {
    const { rows: result } = await db.query(`select count(*)::int as count from ${name}`);
    if (result[0].count !== 0) throw new Error(`Target ${name} is not empty; refusing import`);
  }

  // Blob files are staged before database writes. Keep Supabase files and old signed links intact.
  const objects: { bucket: string; path: string; size: number; sha256: string; blobUrl: string }[] = [];
  for (const object of skipBlob ? [] : (manifest.objects ?? [])) {
    if (object.bucket !== "branding" && object.bucket !== "invoice-pdfs") throw new Error("Unknown backup bucket");
    const path = resolve(root, object.bucket, object.path);
    const rel = relative(root, path);
    if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Unsafe backup object path");
    const bytes = await readFile(path);
    if (bytes.length !== object.size || createHash("sha256").update(bytes).digest("hex") !== object.sha256)
      throw new Error(`Backup object mismatch: ${object.bucket}/${object.path}`);
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is required for object migration");
    const blob = await put(`${object.bucket}/${object.path}`, bytes, {
      access: "private",
      addRandomSuffix: false,
      contentType: object.bucket === "invoice-pdfs" ? "application/pdf" : undefined,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    objects.push({ ...object, blobUrl: blob.url });
  }
  if (!skipBlob) await writeFile(join(root, "blob-import-manifest.json"), JSON.stringify(objects, null, 2));

  await db.query("begin");
  const triggerTables = ["profiles", "clients", "items", "invoices", "invoice_items", "payments", "invoice_counters", "gmail_connections"];
  for (const name of triggerTables) await db.query(`alter table public.${name} disable trigger user`);

  const insert = async (name: string, row: Record<string, unknown>) => {
    const columns = Object.keys(row);
    if (!columns.length || columns.some((c) => !/^[a-z_][a-z0-9_]*$/.test(c))) throw new Error(`Invalid column in ${name}`);
    const sql = `insert into ${name} (${columns.map((c) => `"${c}"`).join(",")}) values (${columns.map((_, i) => `$${i + 1}`).join(",")})`;
    await db.query(sql, columns.map((c) => row[c]));
  };
  for (const user of users) {
    await insert("auth.users", {
      id: user.id, email: user.email ?? null,
      raw_app_meta_data: user.app_metadata ?? {}, raw_user_meta_data: user.user_metadata ?? {},
      created_at: user.created_at ?? null, updated_at: user.updated_at ?? null,
    });
  }
  for (const name of tables) {
    for (const row of rows.get(name) ?? []) {
      if (name === "invoices" && row.original_invoice_id) await insert(`public.${name}`, { ...row, original_invoice_id: null });
      else await insert(`public.${name}`, row);
    }
  }
  for (const row of rows.get("invoices") ?? []) {
    if (row.original_invoice_id) await db.query("update public.invoices set original_invoice_id=$1 where id=$2", [row.original_invoice_id, row.id]);
  }
  for (const name of triggerTables) await db.query(`alter table public.${name} enable trigger user`);

  for (const name of tables) {
    const { rows: result } = await db.query(`select count(*)::int as count from public.${name}`);
    if (result[0].count !== manifest.tables[name].count) throw new Error(`Target row count mismatch: ${name}`);
  }
  const { rows: authCount } = await db.query("select count(*)::int as count from auth.users");
  if (authCount[0].count !== manifest.users) throw new Error("Target auth user count mismatch");
  await db.query("commit");
  console.log(`Neon import committed: ${manifest.users} users, ${tables.map((t) => `${t}=${manifest.tables[t].count}`).join(", ")}, blob_objects=${objects.length}${skipBlob ? " (Blob migration skipped)" : ""}`);
} catch (error) {
  await db.query("rollback").catch(() => {});
  throw error;
} finally {
  await db.end();
}
