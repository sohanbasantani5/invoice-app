-- 0007: keep encrypted Gmail token material out of authenticated client queries.
-- The server-only Gmail actions use the service-role client with explicit user_id predicates.
revoke all on public.gmail_connections from authenticated;
grant select (user_id, email, created_at) on public.gmail_connections to authenticated;

-- The RLS policy remains in force for the safe status columns.
select has_table_privilege('authenticated', 'public.gmail_connections', 'select') as safe_status_select;
-- Keep branding uploads to the same private bucket, but allow only raster image types.
update storage.buckets
set allowed_mime_types = array['image/png','image/jpeg'], file_size_limit = 1048576
where id = 'branding';

create or replace function public.check_original_invoice_owner() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.original_invoice_id is not null and not exists (
    select 1 from public.invoices
    where id = new.original_invoice_id and user_id = auth.uid()
  ) then
    raise exception 'original invoice not found';
  end if;
  return new;
end $$;

drop trigger if exists check_original_invoice_owner on public.invoices;
create trigger check_original_invoice_owner
before insert or update of original_invoice_id on public.invoices
for each row execute function public.check_original_invoice_owner();

revoke all on function public.check_original_invoice_owner() from public, anon;
