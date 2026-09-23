-- Allow computer inventory to be created with 0 to 6 photos.
-- Photos can be added later from Edit Computer.

create or replace function public.create_computer_inventory_with_photos(
  p_computer_type text,
  p_brand text,
  p_model_name text,
  p_cpu text,
  p_ram text,
  p_primary_storage_type text,
  p_primary_storage_size text,
  p_secondary_storage_type text,
  p_secondary_storage_size text,
  p_gpu text,
  p_screen_size text,
  p_color text,
  p_serial_number text,
  p_condition text,
  p_purchase_from text,
  p_purchase_date date,
  p_purchase_price numeric,
  p_sale_price numeric,
  p_photo_paths text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_computer_id uuid;
begin
  if v_actor is null then
    raise exception 'You must be signed in';
  end if;

  if not exists (
    select 1
    from public.profiles p
    join public.user_roles ur
      on ur.user_id = p.id
    where p.id = v_actor
      and p.is_active = true
      and ur.role in ('owner', 'manager', 'computer_staff')
  ) then
    raise exception 'You are not allowed to create computer inventory';
  end if;

  if coalesce(cardinality(p_photo_paths), 0) > 6 then
    raise exception 'A computer can have at most 6 photos';
  end if;

  insert into public.computer_inventory_items (
    computer_type,
    brand,
    model_name,
    cpu,
    ram,
    primary_storage_type,
    primary_storage_size,
    secondary_storage_type,
    secondary_storage_size,
    gpu,
    screen_size,
    color,
    serial_number,
    condition,
    purchase_from,
    purchase_date,
    purchase_price,
    sale_price
  )
  values (
    trim(p_computer_type)::public.computer_type,
    nullif(trim(p_brand), ''),
    trim(p_model_name),
    nullif(trim(p_cpu), ''),
    nullif(trim(p_ram), ''),
    nullif(trim(p_primary_storage_type), ''),
    nullif(trim(p_primary_storage_size), ''),
    nullif(trim(p_secondary_storage_type), ''),
    nullif(trim(p_secondary_storage_size), ''),
    nullif(trim(p_gpu), ''),
    nullif(trim(p_screen_size), ''),
    nullif(trim(p_color), ''),
    trim(p_serial_number),
    nullif(trim(p_condition), '')::public.computer_condition,
    nullif(trim(p_purchase_from), ''),
    p_purchase_date,
    coalesce(p_purchase_price, 0),
    coalesce(p_sale_price, 0)
  )
  returning id into v_computer_id;

  insert into public.computer_inventory_photos (
    computer_id,
    storage_path,
    sort_order
  )
  select
    v_computer_id,
    photo.path,
    photo.ordinality - 1
  from unnest(
    coalesce(p_photo_paths, array[]::text[])
  ) with ordinality as photo(path, ordinality)
  where nullif(trim(photo.path), '') is not null;

  return v_computer_id;
end;
$$;

revoke all
on function public.create_computer_inventory_with_photos(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  numeric,
  numeric,
  text[]
)
from public;

grant execute
on function public.create_computer_inventory_with_photos(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  date,
  numeric,
  numeric,
  text[]
)
to authenticated;
