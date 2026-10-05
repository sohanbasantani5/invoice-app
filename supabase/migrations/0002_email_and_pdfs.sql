-- 0002: email-invoice support. Safe to run more than once.
-- 1. Private bucket for the PDFs that email links point to (one folder per user).
-- 2. Editable email template on the profile (NULL = built-in default).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoice-pdfs', 'invoice-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Only the owner can upload / read / replace / delete their own PDFs.
-- Clients open them through a signed link (expires in 30 days), never a public URL.
drop policy if exists "invoice-pdfs own folder" on storage.objects;
create policy "invoice-pdfs own folder" on storage.objects for all to authenticated
  using (bucket_id = 'invoice-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'invoice-pdfs' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter table public.profiles add column if not exists email_subject_template text;
alter table public.profiles add column if not exists email_body_template text;

-- Check: should list 1 bucket row, 2 columns.
select (select count(*) from storage.buckets where id = 'invoice-pdfs') as bucket,
       (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles' and column_name like 'email_%_template') as columns;
