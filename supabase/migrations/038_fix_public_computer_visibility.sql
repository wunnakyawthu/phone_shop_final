-- Only computers explicitly marked for the public website may appear in
-- the public computer catalog or be opened through a direct public URL.
-- This intentionally keeps the RPC signatures introduced earlier unchanged.

create or replace function public.get_public_computer_catalog()
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
  photo_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    coalesce(nullif(trim(c.brand), ''), cb.name) as brand_name,
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
    ) as photo_path
  from public.computer_inventory_items c
  left join public.computer_brands cb
    on cb.id = c.brand_id
  where c.status = 'in_stock'
    and coalesce(c.is_deleted, false) = false
    and c.is_publicly_visible = true
  order by c.created_at desc;
$$;

revoke all
on function public.get_public_computer_catalog()
from public;

grant execute
on function public.get_public_computer_catalog()
to anon, authenticated;


create or replace function public.get_public_computer_device(
  p_public_id uuid
)
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
  photo_paths jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    coalesce(nullif(trim(c.brand), ''), cb.name) as brand_name,
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
          jsonb_build_object(
            'path', p.storage_path,
            'sort_order', p.sort_order
          )
          order by p.sort_order asc, p.created_at asc
        )
        from public.computer_inventory_photos p
        where p.computer_id = c.id
      ),
      '[]'::jsonb
    ) as photo_paths
  from public.computer_inventory_items c
  left join public.computer_brands cb
    on cb.id = c.brand_id
  where c.id = p_public_id
    and c.status = 'in_stock'
    and coalesce(c.is_deleted, false) = false
    and c.is_publicly_visible = true;
$$;

revoke all
on function public.get_public_computer_device(uuid)
from public;

grant execute
on function public.get_public_computer_device(uuid)
to anon, authenticated;
