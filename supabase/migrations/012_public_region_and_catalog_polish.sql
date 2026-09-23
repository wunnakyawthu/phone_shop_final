-- Public catalog polish:
-- expose the optional iPhone sales-region code to anonymous catalog readers.
-- Sensitive inventory fields (IMEI, purchase cost, seller/staff data) remain excluded.

drop function if exists public.get_public_catalog_device(uuid);
drop function if exists public.get_public_catalog_devices(public.product_category, text, public.device_state);

create or replace function public.get_public_catalog_devices(
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
  photo_paths jsonb
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
        ' ',
        b.name,
        m.name,
        d.color,
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
    )
  from public.device_units d
  join public.product_models m on m.id = d.product_model_id
  join public.brands b on b.id = m.brand_id
  where d.status = 'in_stock'
    and d.is_publicly_visible = true
    and (p_category is null or d.category = p_category)
    and (p_device_state is null or d.device_state = p_device_state)
    and (
      p_search is null or trim(p_search) = ''
      or concat_ws(
        ' ',
        b.name,
        m.name,
        d.color,
        d.cpu_processor,
        d.gpu_graphics,
        d.storage_capacity_gb::text,
        d.iphone_region_code
      ) ilike '%' || trim(p_search) || '%'
    )
  order by d.created_at desc;
$$;

create or replace function public.get_public_catalog_device(p_public_id uuid)
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
  photo_paths jsonb
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
