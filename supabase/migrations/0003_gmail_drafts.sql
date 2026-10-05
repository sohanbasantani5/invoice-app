-- 0003: Gmail drafts with the PDF attached. Safe to run more than once.
-- 1. gmail_connections: one row per user, holding the ENCRYPTED Google refresh token.
--    (Encrypted by the server with a key that never reaches the browser.)
-- 2. A separate editable body for the "no Gmail connected" email (profiles.email_body_fallback_template).
-- 3. Templates saved with the old default wording go back to "use the built-in default".

create table if not exists public.gmail_connections (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  email text not null,
  refresh_token_enc text not null,
  created_at timestamptz not null default now()
);
alter table public.gmail_connections enable row level security;
revoke all on public.gmail_connections from anon;
grant select, insert, update, delete on public.gmail_connections to authenticated;
drop policy if exists "own row" on public.gmail_connections;
create policy "own row" on public.gmail_connections for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.profiles add column if not exists email_body_fallback_template text;

update public.profiles set email_subject_template = null
 where replace(email_subject_template, E'\r', '') = 'Invoice {invoice_no} from {business_name}';
update public.profiles set email_body_template = null
 where replace(email_body_template, E'\r', '') = E'Hi {client_name},\n\nPlease find attached invoice {invoice_no} for {amount}{due_phrase}.\n\nView invoice: {link}\n\n{payment_details}\n\nThank you,\n{my_name}\n{business_line}';

-- Check: rls = true, 1 policy, 1 column.
select (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'gmail_connections') as rls,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'gmail_connections') as policies,
       (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email_body_fallback_template') as column_added;
