-- Add template_id to profiles and invoices
alter table public.profiles add column if not exists default_template_id text not null default 'default';
alter table public.invoices add column if not exists template_id text not null default 'default';
