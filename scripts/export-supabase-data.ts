/** Read-only, paginated local backup. Run with Node 22 and --env-file=.env.local. */
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false } });
const root = join(process.cwd(), "backup", new Date().toISOString().replace(/[:.]/g, "-"));
const tables = ["profiles", "clients", "items", "invoices", "invoice_items", "payments", "invoice_counters", "gmail_connections"] as const;
const manifest: Record<string, unknown> = { created_at: new Date().toISOString(), tables: {}, objects: [] };
// A missing table means the source project/schema is wrong, not an empty table.
// Check the whole source before creating a backup directory.
for (const table of tables) {
  const { error } = await db.from(table).select("*").limit(1);
  if (error) throw new Error(`Source preflight failed for ${table}: ${error.message}`);
}
await mkdir(root, { recursive: true });

const users: unknown[] = [];
for (let page = 1; ; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  users.push(...data.users);
  if (data.users.length < 100) break;
}
await writeFile(join(root, "auth-users.json"), JSON.stringify(users));
manifest.users = users.length;

for (const table of tables) {
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from(table).select("*").range(offset, offset + 499);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  const bytes = Buffer.from(JSON.stringify(rows));
  await writeFile(join(root, `${table}.json`), bytes);
  (manifest.tables as Record<string, unknown>)[table] = { count: rows.length, sha256: createHash("sha256").update(bytes).digest("hex") };
}

async function visit(bucket: "branding" | "invoice-pdfs", prefix: string) {
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 100, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const entry of data ?? []) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (!entry.id) { await visit(bucket, path); continue; }
      const { data: blob, error: downloadError } = await db.storage.from(bucket).download(path);
      if (downloadError || !blob) throw new Error(`${bucket}/${path}: ${downloadError?.message}`);
      const bytes = Buffer.from(await blob.arrayBuffer());
      const dest = join(root, bucket, ...path.split("/"));
      await mkdir(join(dest, ".."), { recursive: true });
      await writeFile(dest, bytes);
      (manifest.objects as unknown[]).push({ bucket, path, size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    }
    if (!data || data.length < 100) break;
  }
}
await visit("branding", "");
await visit("invoice-pdfs", "");
await writeFile(join(root, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Backup completed: ${root}`);
