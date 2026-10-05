-- 0001 — Schema (see docs/03-ARCHITECTURE.md §3).
-- Creates the tables, Row Level Security on every one, helper functions,
-- and the private "branding" storage bucket.
-- Safe to run more than once.

-- ─── 1. Shared trigger: keep updated_at fresh ────────────────────────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ─── 2. Tables ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  business_name text, legal_name text, email text, phone text,
  address_line1 text, address_line2 text, city text, state_code char(2), pincode text,
  gst_status text not null default 'unregistered' check (gst_status in ('unregistered','regular','composition')),
  gstin text, pan text,
  logo_path text, signature_path text,
  bank_name text, bank_account_name text, bank_account_number text, bank_ifsc text, upi_id text,
  invoice_prefix text not null default 'INV',
  default_due_days int not null default 7,
  default_notes text, default_terms text,
  round_off_default boolean not null default true,
  template_accent text not null default 'pine' check (template_accent in ('pine','ink','navy','terracotta')),
  show_logo boolean not null default true,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  client_type text not null default 'individual' check (client_type in ('individual','business_registered','business_unregistered','overseas')),
  contact_person text, email text, phone text,
  address_line1 text, address_line2 text, city text, state_code char(2), pincode text,
  country text not null default 'India',
  gstin text, pan text,
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists clients_user_name_idx on public.clients (user_id, name);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  description text, sac_hsn text, unit text default 'nos',
  rate_paise bigint not null default 0,
  gst_rate numeric(5,2) not null default 0,
  use_count int not null default 0, last_used_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- case-insensitive: "Podcast edit" and "podcast edit" are the same item
create unique index if not exists items_user_lower_name_key on public.items (user_id, lower(name));

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  client_id uuid references public.clients on delete set null,
  doc_type text not null default 'invoice' check (doc_type in ('tax_invoice','bill_of_supply','invoice','credit_note')),
  invoice_number text not null check (char_length(invoice_number) <= 16 and invoice_number ~ '^[A-Za-z0-9/-]+$'),
  financial_year text not null,
  sequence int,
  status text not null default 'draft' check (status in ('draft','sent','paid','partially_paid','cancelled')),
  issue_date date not null default current_date,
  due_date date,
  place_of_supply_code char(2),
  reverse_charge boolean not null default false,
  currency char(3) not null default 'INR',
  reference text,
  original_invoice_id uuid references public.invoices on delete set null, -- credit notes
  seller jsonb not null default '{}'::jsonb,
  buyer jsonb not null default '{}'::jsonb,
  ship_to jsonb,
  round_off_enabled boolean not null default true,
  tds_enabled boolean not null default false, tds_rate numeric(5,2) not null default 0,
  tds_label text not null default 'TDS',
  subtotal_paise bigint not null default 0, discount_paise bigint not null default 0,
  taxable_paise bigint not null default 0, cgst_paise bigint not null default 0,
  sgst_paise bigint not null default 0, igst_paise bigint not null default 0,
  round_off_paise bigint not null default 0, total_paise bigint not null default 0,
  tds_paise bigint not null default 0, amount_paid_paise bigint not null default 0,
  notes text, terms text,
  show_bank boolean not null default true, show_upi_qr boolean not null default true, show_signature boolean not null default true,
  sent_at timestamptz, paid_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);
create index if not exists invoices_user_date_idx on public.invoices (user_id, issue_date desc);
create index if not exists invoices_client_idx on public.invoices (client_id);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  position int not null,
  name text not null, description text, sac_hsn text, unit text,
  quantity numeric(12,3) not null default 1,
  rate_paise bigint not null default 0,
  discount_paise bigint not null default 0,
  gst_rate numeric(5,2) not null default 0,
  taxable_paise bigint not null default 0, tax_paise bigint not null default 0, amount_paise bigint not null default 0
);
create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id, position);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  paid_on date not null default current_date,
  method text check (method in ('upi','bank_transfer','cash','cheque','other')),
  reference text,
  created_at timestamptz not null default now()
);
create index if not exists payments_invoice_idx on public.payments (invoice_id);

create table if not exists public.invoice_counters (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  financial_year text not null,
  last_seq int not null default 0,
  primary key (user_id, financial_year)
);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','clients','items','invoices'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ─── 3. Row Level Security: every row belongs to exactly one user ────────────
do $$
declare t text;
begin
  foreach t in array array['profiles','clients','items','invoices','invoice_items','payments','invoice_counters'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

create policy "own rows" on public.profiles for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.clients for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.invoice_counters for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.invoices for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (client_id is null or exists (select 1 from public.clients c where c.id = client_id and c.user_id = (select auth.uid())))
  );
-- child rows must also point at the user's own invoice
create policy "own rows" on public.invoice_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = (select auth.uid())));
create policy "own rows" on public.payments for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = (select auth.uid())));

-- ─── 4. Functions (all SECURITY INVOKER → they run under the caller's RLS) ───

-- Reserve the next invoice sequence for a financial year. Atomic: the counter
-- row is locked by the upsert, so two tabs can never get the same number.
create or replace function public.next_invoice_number(p_fy text) returns int
language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_max int;
  v_seq int;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  select coalesce(max(sequence), 0) into v_max
    from public.invoices where user_id = v_uid and financial_year = p_fy;
  insert into public.invoice_counters as c (user_id, financial_year, last_seq)
    values (v_uid, p_fy, v_max + 1)
  on conflict (user_id, financial_year)
    do update set last_seq = greatest(c.last_seq, v_max) + 1
  returning last_seq into v_seq;
  return v_seq;
end $$;

-- Save an invoice and its lines in one transaction.
-- p_invoice: invoice columns as JSON (include "id" to update). p_items: array of line objects.
-- Totals must already be computed by lib/invoice/calc.ts on the server.
create or replace function public.save_invoice(p_invoice jsonb, p_items jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.invoices;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  r := jsonb_populate_record(null::public.invoices, p_invoice);
  v_id := coalesce(r.id, gen_random_uuid());

  insert into public.invoices as i (
    id, user_id, client_id, doc_type, invoice_number, financial_year, sequence, status,
    issue_date, due_date, place_of_supply_code, reverse_charge, currency, reference, original_invoice_id,
    seller, buyer, ship_to, round_off_enabled, tds_enabled, tds_rate, tds_label,
    subtotal_paise, discount_paise, taxable_paise, cgst_paise, sgst_paise, igst_paise,
    round_off_paise, total_paise, tds_paise,
    notes, terms, show_bank, show_upi_qr, show_signature, sent_at
  ) values (
    v_id, v_uid, r.client_id, coalesce(r.doc_type, 'invoice'), r.invoice_number, r.financial_year, r.sequence,
    coalesce(r.status, 'draft'),
    coalesce(r.issue_date, current_date), r.due_date, r.place_of_supply_code, coalesce(r.reverse_charge, false),
    coalesce(r.currency, 'INR'), r.reference, r.original_invoice_id,
    coalesce(r.seller, '{}'::jsonb), coalesce(r.buyer, '{}'::jsonb), r.ship_to,
    coalesce(r.round_off_enabled, true), coalesce(r.tds_enabled, false), coalesce(r.tds_rate, 0), coalesce(r.tds_label, 'TDS'),
    coalesce(r.subtotal_paise, 0), coalesce(r.discount_paise, 0), coalesce(r.taxable_paise, 0),
    coalesce(r.cgst_paise, 0), coalesce(r.sgst_paise, 0), coalesce(r.igst_paise, 0),
    coalesce(r.round_off_paise, 0), coalesce(r.total_paise, 0), coalesce(r.tds_paise, 0),
    r.notes, r.terms, coalesce(r.show_bank, true), coalesce(r.show_upi_qr, true), coalesce(r.show_signature, true), r.sent_at
  )
  on conflict (id) do update set
    client_id = excluded.client_id, doc_type = excluded.doc_type, invoice_number = excluded.invoice_number,
    financial_year = excluded.financial_year, sequence = excluded.sequence,
    issue_date = excluded.issue_date, due_date = excluded.due_date,
    place_of_supply_code = excluded.place_of_supply_code, reverse_charge = excluded.reverse_charge,
    currency = excluded.currency, reference = excluded.reference, original_invoice_id = excluded.original_invoice_id,
    seller = excluded.seller, buyer = excluded.buyer, ship_to = excluded.ship_to,
    round_off_enabled = excluded.round_off_enabled, tds_enabled = excluded.tds_enabled,
    tds_rate = excluded.tds_rate, tds_label = excluded.tds_label,
    subtotal_paise = excluded.subtotal_paise, discount_paise = excluded.discount_paise,
    taxable_paise = excluded.taxable_paise, cgst_paise = excluded.cgst_paise, sgst_paise = excluded.sgst_paise,
    igst_paise = excluded.igst_paise, round_off_paise = excluded.round_off_paise,
    total_paise = excluded.total_paise, tds_paise = excluded.tds_paise,
    notes = excluded.notes, terms = excluded.terms, show_bank = excluded.show_bank,
    show_upi_qr = excluded.show_upi_qr, show_signature = excluded.show_signature
  where i.user_id = v_uid;

  if not found then raise exception 'invoice not found'; end if;

  delete from public.invoice_items where invoice_id = v_id;
  insert into public.invoice_items (
    invoice_id, user_id, position, name, description, sac_hsn, unit, quantity,
    rate_paise, discount_paise, gst_rate, taxable_paise, tax_paise, amount_paise
  )
  select v_id, v_uid, coalesce(x.position, (o.n - 1)::int), x.name, x.description, x.sac_hsn, x.unit,
         coalesce(x.quantity, 1), coalesce(x.rate_paise, 0), coalesce(x.discount_paise, 0), coalesce(x.gst_rate, 0),
         coalesce(x.taxable_paise, 0), coalesce(x.tax_paise, 0), coalesce(x.amount_paise, 0)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as o(j, n),
       lateral jsonb_populate_record(null::public.invoice_items, o.j) as x
  where coalesce(trim(x.name), '') <> '';

  return v_id;
end $$;

-- Remember services typed on an invoice (powers the "P" → "Podcast edit" autocomplete).
-- p_items: [{name, description, sac_hsn, unit, rate_paise, gst_rate}]
create or replace function public.record_items(p_items jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.items as it (user_id, name, description, sac_hsn, unit, rate_paise, gst_rate, use_count, last_used_at)
  select distinct on (lower(trim(x.name)))
         auth.uid(), trim(x.name), x.description, x.sac_hsn, coalesce(x.unit, 'nos'),
         coalesce(x.rate_paise, 0), coalesce(x.gst_rate, 0), 1, now()
  from jsonb_populate_recordset(null::public.items, coalesce(p_items, '[]'::jsonb)) as x
  where coalesce(trim(x.name), '') <> ''
  on conflict (user_id, lower(name)) do update set
    description = coalesce(excluded.description, it.description),
    sac_hsn = coalesce(nullif(excluded.sac_hsn, ''), it.sac_hsn),
    unit = excluded.unit, rate_paise = excluded.rate_paise, gst_rate = excluded.gst_rate,
    use_count = it.use_count + 1, last_used_at = now();
end $$;

-- Keep invoices.amount_paid_paise + status in sync with the payments table.
create or replace function public.sync_invoice_payments() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid := coalesce(new.invoice_id, old.invoice_id);
  v_paid bigint;
begin
  select coalesce(sum(amount_paise), 0) into v_paid from public.payments where invoice_id = v_id;
  update public.invoices i set
    amount_paid_paise = v_paid,
    status = case
      when i.status = 'cancelled' then i.status
      when v_paid > 0 and v_paid >= i.total_paise - i.tds_paise then 'paid'
      when v_paid > 0 then 'partially_paid'
      when i.status in ('paid', 'partially_paid') then 'sent'
      else i.status end,
    paid_at = case when v_paid > 0 and v_paid >= i.total_paise - i.tds_paise then coalesce(i.paid_at, now()) else null end
  where i.id = v_id;
  return null;
end $$;

drop trigger if exists sync_invoice_payments on public.payments;
create trigger sync_invoice_payments after insert or update or delete on public.payments
  for each row execute function public.sync_invoice_payments();

revoke all on function public.next_invoice_number(text) from public, anon;
revoke all on function public.save_invoice(jsonb, jsonb) from public, anon;
revoke all on function public.record_items(jsonb) from public, anon;
grant execute on function public.next_invoice_number(text) to authenticated;
grant execute on function public.save_invoice(jsonb, jsonb) to authenticated;
grant execute on function public.record_items(jsonb) to authenticated;

-- ─── 5. Storage: private "branding" bucket, one folder per user ──────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', false, 1048576, array['image/png','image/jpeg','image/svg+xml','image/webp'])
on conflict (id) do nothing;

drop policy if exists "branding own folder" on storage.objects;
create policy "branding own folder" on storage.objects for all to authenticated
  using (bucket_id = 'branding' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'branding' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ─── Check: every public table must show rowsecurity = true ──────────────────
select tablename, rowsecurity,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename) as policies
from pg_tables t where schemaname = 'public' order by tablename;
