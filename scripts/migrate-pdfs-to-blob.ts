/** Migrate invoice PDFs from local backup to Vercel Blob. */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, relative, isAbsolute, join } from "node:path";
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";

const backupArg = process.argv[2];
if (!backupArg) throw new Error("Usage: node --env-file=.env.local --experimental-strip-types scripts/migrate-pdfs-to-blob.ts <completed-backup-folder>");
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is required");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const root = resolve(backupArg);
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));

const objects: { bucket: string; path: string; size: number; sha256: string; blobUrl: string }[] = [];
for (const object of manifest.objects ?? []) {
  if (object.bucket !== "invoice-pdfs") continue;
  const path = resolve(root, object.bucket, object.path);
  const rel = relative(root, path);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Unsafe backup object path");
  const bytes = await readFile(path);
  if (bytes.length !== object.size || createHash("sha256").update(bytes).digest("hex") !== object.sha256)
    throw new Error(`Backup object mismatch: ${object.bucket}/${object.path}`);
  const blob = await put(`${object.bucket}/${object.path}`, bytes, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/pdf",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  objects.push({ ...object, blobUrl: blob.url });
}

await writeFile(join(root, "blob-import-manifest.json"), JSON.stringify(objects, null, 2));
console.log(`Migrated ${objects.length} PDF(s) to Vercel Blob.`);
for (const obj of objects) console.log(`  ${obj.path} -> ${obj.blobUrl}`);