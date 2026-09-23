-- Public computer catalog

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

  cb.name,

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
    select cp.storage_path
    from public.computer_photos cp
    where cp.computer_id = c.id
    order by cp.sort_order
    limit 1
  )

from public.computer_inventory_items c

left join public.computer_brands cb
on cb.id = c.brand_id

where c.status = 'in_stock'
-- and c.is_publicly_visible = true
order by c.created_at desc;


$$;


grant execute
on function public.get_public_computer_catalog()
to anon, authenticated;