-- Store branding that can be managed by the owner and reused everywhere.
-- Keeps the existing owner-only store_settings table private while exposing
-- only safe public-facing fields through a narrow RPC.

alter table public.store_settings
add column if not exists logo_path text;

insert into public.store_settings (id, store_name)
values (true, 'Retail Hub')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-branding',
  'store-branding',
  true,
  2097152,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists store_branding_owner_insert on storage.objects;
create policy store_branding_owner_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'store-branding'
  and public.is_owner()
);

drop policy if exists store_branding_owner_update on storage.objects;
create policy store_branding_owner_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'store-branding'
  and public.is_owner()
)
with check (
  bucket_id = 'store-branding'
  and public.is_owner()
);

drop policy if exists store_branding_owner_delete on storage.objects;
create policy store_branding_owner_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'store-branding'
  and public.is_owner()
);

create or replace function public.get_public_store_branding()
returns table (
  store_name text,
  logo_path text,
  phone text,
  facebook_url text,
  viber_url text,
  tiktok_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.store_name,
    s.logo_path,
    s.phone,
    s.facebook_url,
    s.viber_url,
    s.tiktok_url
  from public.store_settings s
  where s.id = true
  limit 1;
$$;

revoke all
on function public.get_public_store_branding()
from public;

grant execute
on function public.get_public_store_branding()
to anon, authenticated;
