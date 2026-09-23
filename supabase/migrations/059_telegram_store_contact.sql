alter table public.store_settings
  add column if not exists telegram_url text;

drop function if exists public.get_public_store_branding();
create function public.get_public_store_branding()
returns table (
  store_name text,
  workspace_label text,
  logo_path text,
  phone text,
  facebook_url text,
  viber_url text,
  tiktok_url text,
  address text,
  google_maps_url text,
  telegram_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.store_name, s.workspace_label, s.logo_path, s.phone,
         s.facebook_url, s.viber_url, s.tiktok_url, s.address,
         s.google_maps_url, s.telegram_url
  from public.store_settings s
  where s.id = true
  limit 1;
$$;

revoke all on function public.get_public_store_branding() from public;
grant execute on function public.get_public_store_branding() to anon, authenticated;
