-- Record-Payment TDS: additive columns on `payments` (100% additive, backwards-compatible).
-- The sync trigger is updated by re-running 001_neon_init.sql (it is CREATE OR REPLACE and safe
-- to re-run); this file only adds the columns to an already-migrated install.
alter table public.payments add column if not exists tds_paise bigint not null default 0;
alter table public.payments add column if not exists tds_rate numeric(5,2) not null default 0;
