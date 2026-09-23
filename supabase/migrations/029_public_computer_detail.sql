-- Public computer detail

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

  cb.name,

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

  (
    select
      jsonb_agg(
        jsonb_build_object(
          'path',
          cp.storage_path,
          'sort_order',
          cp.sort_order
        )
        order by cp.sort_order
      )

    from public.computer_photos cp

    where cp.computer_id = c.id
  )


from public.computer_inventory_items c


left join public.computer_brands cb
on cb.id = c.brand_id


where c.id = p_public_id

and c.status = 'in_stock';

--and c.is_publicly_visible = true;
$$;


grant execute
on function public.get_public_computer_device(uuid)
to anon, authenticated;