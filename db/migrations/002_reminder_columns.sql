-- Reminder cron needs a per-invoice reminder counter. Added after the fact;
-- 001_neon_init.sql only created auto_remind / last_reminder_sent_at.
alter table public.invoices add column if not exists reminder_count integer not null default 0;
