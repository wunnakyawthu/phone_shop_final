-- V23: replace the retired Important Message field with customer-visible notes,
-- add the public shop location, and keep catalog RPCs narrowly scoped.

alter table public.store_settings
  add column if not exists google_maps_url text;

update public.store_settings
set google_maps_url = coalesce(
  nullif(trim(google_maps_url), ''),
  'https://maps.app.goo.gl/8cf3TtDqJ8wbCuU28'
)
where id = true;

-- Important Message is retired. Keep the columns for migration compatibility,
-- but erase historical values and stop exposing/writing them in the app.
update public.device_units
set important_message_type = null,
    important_message_other = null
where important_message_type is not null
   or important_message_other is not null;

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
  google_maps_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.store_name, s.workspace_label, s.logo_path, s.phone,
         s.facebook_url, s.viber_url, s.tiktok_url, s.address,
         s.google_maps_url
  from public.store_settings s
  where s.id = true
  limit 1;
$$;

revoke all on function public.get_public_store_branding() from public;
grant execute on function public.get_public_store_branding() to anon, authenticated;

drop function if exists public.get_public_catalog_device(uuid);
drop function if exists public.get_public_catalog_devices(public.product_category, text, public.device_state);

create function public.get_public_catalog_devices(
  p_category public.product_category default null,
  p_search text default null,
  p_device_state public.device_state default null
)
returns table (
  public_id uuid,
  category public.product_category,
  device_state public.device_state,
  brand_name text,
  model_name text,
  public_title text,
  color text,
  ram_gb smallint,
  storage_type text,
  storage_capacity_gb integer,
  cpu_processor text,
  gpu_graphics text,
  screen_size_inches numeric,
  condition public.device_condition,
  battery_health_percent smallint,
  iphone_region_code text,
  sale_price_mmk bigint,
  photo_paths jsonb,
  internal_notes text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.public_token,
    d.category,
    d.device_state,
    b.name,
    m.name,
    coalesce(
      nullif(d.public_title_override, ''),
      concat_ws(
        ' ', b.name, m.name, d.color,
        case when d.category = 'phone' and d.storage_capacity_gb is not null
          then concat(d.storage_capacity_gb, ' GB') else null end
      )
    ),
    d.color,
    d.ram_gb,
    d.storage_type,
    d.storage_capacity_gb,
    d.cpu_processor,
    d.gpu_graphics,
    d.screen_size_inches,
    d.condition,
    d.battery_health_percent,
    d.iphone_region_code,
    d.sale_price_mmk,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('path', photo.storage_path, 'sort_order', photo.sort_order)
          order by photo.sort_order
        )
        from public.device_photos photo
        where photo.device_unit_id = d.id and photo.is_public = true
      ),
      '[]'::jsonb
    ),
    d.internal_notes
  from public.device_units d
  join public.product_models m on m.id = d.product_model_id
  join public.brands b on b.id = m.brand_id
  where d.status = 'in_stock'
    and d.is_publicly_visible = true
    and (p_category is null or d.category = p_category)
    and (p_device_state is null or d.device_state = p_device_state)
    and (
      p_search is null or trim(p_search) = ''
      or concat_ws(' ', b.name, m.name, d.color, d.cpu_processor,
        d.gpu_graphics, d.storage_capacity_gb::text, d.iphone_region_code)
        ilike '%' || trim(p_search) || '%'
    )
  order by d.created_at desc;
$$;

create function public.get_public_catalog_device(p_public_id uuid)
returns table (
  public_id uuid,
  category public.product_category,
  device_state public.device_state,
  brand_name text,
  model_name text,
  public_title text,
  color text,
  ram_gb smallint,
  storage_type text,
  storage_capacity_gb integer,
  cpu_processor text,
  gpu_graphics text,
  screen_size_inches numeric,
  condition public.device_condition,
  battery_health_percent smallint,
  iphone_region_code text,
  sale_price_mmk bigint,
  photo_paths jsonb,
  internal_notes text
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.get_public_catalog_devices(null, null, null)
  where public_id = p_public_id;
$$;

revoke all on function public.get_public_catalog_devices(public.product_category, text, public.device_state) from public;
revoke all on function public.get_public_catalog_device(uuid) from public;
grant execute on function public.get_public_catalog_devices(public.product_category, text, public.device_state) to anon, authenticated;
grant execute on function public.get_public_catalog_device(uuid) to anon, authenticated;

drop function if exists public.get_public_computer_device(uuid);
drop function if exists public.get_public_computer_catalog();

create function public.get_public_computer_catalog()
returns table (
  id uuid,
  brand_name text,
  model_name text,
  computer_type text,
  cpu text,
  ram text,
  primary_storage_type text,
  primary_storage_size text,
  gpu text,
  screen_size text,
  color text,
  condition text,
  sale_price numeric,
  photo_path text,
  internal_notes text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    coalesce(nullif(trim(c.brand), ''), cb.name),
    c.model_name,
    c.computer_type::text,
    c.cpu,
    c.ram,
    c.primary_storage_type,
    c.primary_storage_size,
    c.gpu,
    c.screen_size,
    c.color,
    c.condition::text,
    c.sale_price,
    (
      select p.storage_path
      from public.computer_inventory_photos p
      where p.computer_id = c.id
      order by p.sort_order asc, p.created_at asc
      limit 1
    ),
    c.internal_notes
  from public.computer_inventory_items c
  left join public.computer_brands cb on cb.id = c.brand_id
  where c.status = 'in_stock'
    and coalesce(c.is_deleted, false) = false
    and c.is_publicly_visible = true
  order by c.created_at desc;
$$;

create function public.get_public_computer_device(p_public_id uuid)
returns table (
  id uuid,
  brand_name text,
  model_name text,
  computer_type text,
  cpu text,
  ram text,
  primary_storage_type text,
  primary_storage_size text,
  secondary_storage_type text,
  secondary_storage_size text,
  gpu text,
  screen_size text,
  color text,
  serial_number text,
  condition text,
  sale_price numeric,
  photo_paths jsonb,
  internal_notes text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    coalesce(nullif(trim(c.brand), ''), cb.name),
    c.model_name,
    c.computer_type::text,
    c.cpu,
    c.ram,
    c.primary_storage_type,
    c.primary_storage_size,
    c.secondary_storage_type,
    c.secondary_storage_size,
    c.gpu,
    c.screen_size,
    c.color,
    c.serial_number,
    c.condition::text,
    c.sale_price,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('path', p.storage_path, 'sort_order', p.sort_order)
          order by p.sort_order asc, p.created_at asc
        )
        from public.computer_inventory_photos p
        where p.computer_id = c.id
      ),
      '[]'::jsonb
    ),
    c.internal_notes
  from public.computer_inventory_items c
  left join public.computer_brands cb on cb.id = c.brand_id
  where c.id = p_public_id
    and c.status = 'in_stock'
    and coalesce(c.is_deleted, false) = false
    and c.is_publicly_visible = true;
$$;

revoke all on function public.get_public_computer_catalog() from public;
revoke all on function public.get_public_computer_device(uuid) from public;
grant execute on function public.get_public_computer_catalog() to anon, authenticated;
grant execute on function public.get_public_computer_device(uuid) to anon, authenticated;
