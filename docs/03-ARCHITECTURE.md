# 03 — Technical Architecture

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript (strict)** | Deploys free on Vercel, server actions, good with Supabase |
| Styling | **Tailwind CSS** + CSS variables from 02-DESIGN-SYSTEM | |
| Components | **shadcn/ui** (restyled) + **21st MCP** components (restyled) | Accessible primitives (Radix) |
| Forms | **react-hook-form** + **Zod** (`@hookform/resolvers`) | One schema for client + server validation |
| Data | **Supabase** (Postgres, Auth, Storage) via `@supabase/ssr` | Already integrated |
| Client cache | **TanStack Query** for lists; server components for first load | |
| Motion | `motion`, `lenis`, `gsap` (+ `@gsap/react` `useGSAP`) | See 02 §8 |
| PDF | **@react-pdf/renderer** (one-click vector PDF download) + `/invoices/[id]/print` route with print CSS as fallback | |
| QR | `qrcode` (generate data URL for UPI QR, used by both preview and PDF) | |
| Icons | `lucide-react` | |
| Dates | `date-fns` | |
| Tests | **Vitest** (unit: calculations, validators, numbering) + **Playwright** (main flow e2e) | |
| Hosting | **Vercel** (frontend) + **Supabase** (DB/auth/storage) | Nothing runs locally |

**Supabase vs alternatives:** keep Supabase. It covers auth, Postgres, file storage and RLS on the free tier, and it is already wired up. (Alternatives considered: Firebase, Convex, Appwrite, Neon + Clerk. None is worth a migration here.)

## 2. Folder structure

```
src/
  app/
    (auth)/login/page.tsx
    (auth)/auth/callback/route.ts        # OAuth / magic-link exchange
    (app)/layout.tsx                     # app shell, auth guard, page transition wrapper
    (app)/template.tsx                   # Motion page transition (re-mounts per route)
    (app)/dashboard/page.tsx
    (app)/invoices/page.tsx
    (app)/invoices/new/page.tsx
    (app)/invoices/[id]/page.tsx
    (app)/invoices/[id]/print/page.tsx
    (app)/clients/page.tsx
    (app)/clients/[id]/page.tsx
    (app)/items/page.tsx
    (app)/settings/page.tsx
    onboarding/page.tsx
    layout.tsx  globals.css
  components/
    ui/                  # shadcn + restyled 21st components
    shell/               # sidebar, bottom nav, command menu
    invoice/
      editor/            # form sections: FromCard, BillToCard, DetailsCard, ItemsTable, TotalsCard, PaymentCard
      preview/           # InvoicePaper.tsx (HTML preview) + useScaleToFit
      pdf/               # InvoicePdf.tsx (@react-pdf version of the same layout)
      ComplianceChecklist.tsx
    motion/              # PageTransition, FadeIn, NumberTicker, SmoothScroll (Lenis provider)
  lib/
    supabase/            # client.ts, server.ts, middleware.ts
    invoice/
      calc.ts            # THE single calculation function (see §5)
      numbering.ts       # FY + sequence helpers
      words.ts           # amount in words (Indian system: lakh, crore)
      compliance.ts      # returns list of missing/invalid fields by doc type
      doc-type.ts        # decides Tax Invoice / Bill of Supply / Invoice
    validation/          # zod schemas: profile, client, item, invoice; gstin.ts, pan.ts
    india/               # states.ts (name + GST code), gst-rates.ts, sac-presets.ts
    format.ts            # money (paise → ₹), dates
  hooks/
  types/database.ts      # generated: `supabase gen types typescript`
supabase/
  migrations/*.sql
tests/
  unit/  e2e/
```

## 3. Database schema (Postgres / Supabase)

All tables have `user_id uuid not null references auth.users on delete cascade`, `created_at timestamptz default now()`, `updated_at timestamptz default now()` (trigger to update). All money columns are **bigint paise**. All percentages are `numeric(5,2)`.

```sql
-- business profile (one per user for v1)
create table profiles (
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
  template_accent text not null default 'pine',
  onboarding_completed boolean not null default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null, contact_person text, email text, phone text,
  address_line1 text, address_line2 text, city text, state_code char(2), pincode text,
  country text not null default 'India',
  gstin text, pan text,
  notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table items (                       -- saved services library (autocomplete)
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,                       -- e.g. "Podcast edit"
  description text, sac_hsn text, unit text default 'nos',
  rate_paise bigint not null default 0,
  gst_rate numeric(5,2) not null default 0,
  use_count int not null default 0, last_used_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (user_id, name)
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  client_id uuid references clients on delete set null,
  doc_type text not null default 'invoice' check (doc_type in ('tax_invoice','bill_of_supply','invoice','credit_note')),
  invoice_number text not null,             -- max 16 chars enforced in app + check
  financial_year text not null,             -- '2026-27'
  sequence int,                             -- numeric part used for auto-increment
  status text not null default 'draft' check (status in ('draft','sent','paid','partially_paid','cancelled')),
  issue_date date not null default current_date,
  due_date date,
  place_of_supply_code char(2),             -- '27'; '96' for outside India
  reverse_charge boolean not null default false,
  currency char(3) not null default 'INR',
  seller jsonb not null,                    -- SNAPSHOT of profile at save time
  buyer jsonb not null,                     -- SNAPSHOT of client at save time
  ship_to jsonb,
  round_off_enabled boolean not null default true,
  tds_enabled boolean not null default false, tds_rate numeric(5,2) default 0,
  subtotal_paise bigint not null default 0, discount_paise bigint not null default 0,
  taxable_paise bigint not null default 0, cgst_paise bigint not null default 0,
  sgst_paise bigint not null default 0, igst_paise bigint not null default 0,
  round_off_paise bigint not null default 0, total_paise bigint not null default 0,
  tds_paise bigint not null default 0, amount_paid_paise bigint not null default 0,
  notes text, terms text,
  show_bank boolean default true, show_upi_qr boolean default true, show_signature boolean default true,
  sent_at timestamptz, paid_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (user_id, invoice_number),
  check (char_length(invoice_number) <= 16)
);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  position int not null,
  name text not null, description text, sac_hsn text, unit text,
  quantity numeric(12,3) not null default 1,
  rate_paise bigint not null default 0,
  discount_paise bigint not null default 0,
  gst_rate numeric(5,2) not null default 0,
  taxable_paise bigint not null default 0, tax_paise bigint not null default 0, amount_paise bigint not null default 0
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  amount_paise bigint not null, paid_on date not null default current_date,
  method text check (method in ('upi','bank_transfer','cash','cheque','other')), reference text,
  created_at timestamptz default now()
);
```

### RLS (apply to every table)
```sql
alter table <t> enable row level security;
create policy "own rows" on <t> for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
```
(`profiles` uses `user_id` as PK, same policy.)

### Invoice number function (no duplicates even with two tabs open)
Create a Postgres function `next_invoice_number(p_fy text)` (security definer is NOT needed; it runs as the user under RLS) that returns `max(sequence)+1` for the user + FY inside a transaction with `for update` lock on a per-user counter table `invoice_counters(user_id, financial_year, last_seq)`. Number format: `{prefix}/{FY}/{seq padded to 3}` e.g. `SB/2026-27/001`. If the result is longer than 16 chars, drop the slashes or shorten the FY to `2627`. The editor shows the proposed number immediately; the final number is assigned on first save.

### Storage
Private bucket `branding` with paths `{user_id}/logo.png`, `{user_id}/signature.png`. RLS on `storage.objects` so users access only their own folder. Use signed URLs for preview and convert to data URL for the PDF.

### Overdue
Not stored. Computed: `status in ('sent','partially_paid') and due_date < today`.

## 4. Auth

- `@supabase/ssr` with Next.js middleware refreshing the session cookie.
- Methods: email + password, magic link, Google OAuth (only if you set up Google credentials; hide the button if env `NEXT_PUBLIC_ENABLE_GOOGLE` is not `true`).
- Redirect URLs must include the Vercel domain and `http://localhost:3000` (for preview builds). Add them in Supabase → Authentication → URL Configuration.
- Guard: `(app)/layout.tsx` checks the session server-side; no profile or `onboarding_completed = false` → `/onboarding`.

## 5. The calculation function (single source of truth)

`lib/invoice/calc.ts` exports `calculateInvoice(input) → result`. Used by the editor totals, the HTML preview, the PDF, and the server action before saving (server recomputes; never trust client totals).

Rules:
1. Per line: `gross = round(quantity × rate_paise)`; `taxable = gross − discount`; `tax = round(taxable × gst_rate / 100)`.
2. Intra-state (supplier state == place of supply): split each line's tax into CGST = `floor(tax/2)`, SGST = `tax − CGST`. Inter-state or export: IGST = tax.
3. If doc type is Bill of Supply or Invoice (unregistered) → all tax = 0 regardless of line rate.
4. Totals = sums of lines. `round_off = round(total to nearest 100 paise) − total` when enabled.
5. TDS (optional) = `round(taxable_total × tds_rate / 100)`; net payable = total − TDS. TDS is computed on the value **excluding GST**.
6. Balance due = total − TDS − amount paid.
7. Rounding = half away from zero, applied with integer math only.

Write Vitest tests for: zero GST, 18% intra, 18% inter, mixed rates, discount, round-off up/down, odd-paise CGST/SGST split, TDS, quantity 2.5.

## 6. Preview and PDF

- `InvoicePaper.tsx` (HTML/Tailwind, A4 ratio, scaled to fit). Receives `{ invoice, calc }`.
- `InvoicePdf.tsx` (@react-pdf/renderer) receives exactly the same props and mirrors the layout using the same tokens (export a shared `templateTokens` object: sizes, colours, spacing).
- Register Inter and Instrument Sans TTFs with `Font.register` (put files in `public/fonts`).
- Download: generate blob client-side with `pdf(<InvoicePdf .../>).toBlob()`, filename `{invoice_number}_{client}.pdf` (sanitise slashes to `-`). Lazy-load the PDF library (`next/dynamic` / dynamic `import()`) so it does not bloat the editor bundle.
- Fallback: `/invoices/[id]/print` renders `InvoicePaper` full size with `@page { size: A4; margin: 0 }` and calls `window.print()`.
- Parity test: Playwright opens an invoice, downloads the PDF, extracts text (pdf-parse) and checks invoice number, client name, total and amount in words match the preview.

## 7. Editor state

- One react-hook-form instance with the invoice Zod schema; `useFieldArray` for items.
- `useWatch` + a 150ms debounce feeds the preview so typing never lags.
- Auto-save drafts every 5 seconds when dirty (server action, optimistic). Show "Saved · just now".
- Unsaved-changes guard on navigation.

## 8. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # or the newer publishable key
SUPABASE_SERVICE_ROLE_KEY=            # server only, only if truly needed (prefer not to use)
NEXT_PUBLIC_SITE_URL=                 # https://<project>.vercel.app
NEXT_PUBLIC_ENABLE_GOOGLE=false
```
Add `.env.example` with these keys (no values). Never commit `.env.local`.

## 9. Scripts (package.json)

`dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (vitest), `test:e2e` (playwright), `db:types` (supabase gen types).
