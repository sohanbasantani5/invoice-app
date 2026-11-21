import { readFile, mkdir, writeFile } from "node:fs/promises";

const read = (name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
const first = await read("0001_schema.sql");
const email = await read("0002_email_and_pdfs.sql");
const gmail = await read("0003_gmail_drafts.sql");
const templates = await read("0006_invoice_templates.sql");
const final = await read("0007_gmail_token_column_access.sql");
const schema = first.split("-- ─── 5. Storage:")[0];
if (!schema.includes("create trigger sync_invoice_payments")) throw new Error("Schema split marker changed");
const credit = final.slice(final.indexOf("create or replace function public.check_original_invoice_owner"));
if (!credit.startsWith("create or replace function")) throw new Error("Credit-note function missing");
const emailColumns = email.slice(email.indexOf("alter table public.profiles add column"), email.indexOf("-- Check: should list"));
if (!emailColumns.startsWith("alter table public.profiles")) throw new Error("Email columns missing");
const output = `-- Neon app schema derived from checked-in Supabase migrations 0001, 0003, 0006, 0007.
-- Run on an EMPTY Neon branch first. Supabase Storage policies are intentionally excluded.
-- The auth.users mirror preserves original UUID foreign keys; it does not import passwords.
begin;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz,
  updated_at timestamptz
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
do $$ begin execute format('grant authenticated to %I', current_user); end $$;
grant usage on schema public, auth to authenticated;
grant execute on function auth.uid() to authenticated;

${schema}
${emailColumns}
${gmail}
${templates}
${credit}

alter table public.invoices add column if not exists auto_remind boolean not null default true;
alter table public.invoices add column if not exists last_reminder_sent_at timestamptz;
create index if not exists invoices_overdue_reminders_idx
  on public.invoices (due_date, user_id)
  where status in ('sent','partially_paid') and auto_remind and last_reminder_sent_at is null;
commit;
`;
await mkdir(new URL("../db/migrations/", import.meta.url), { recursive: true });
await writeFile(new URL("../db/migrations/001_neon_init.sql", import.meta.url), output);
console.log("Generated db/migrations/001_neon_init.sql");
