-- =========================================================
-- 026_fix_computer_purchase_type.sql
-- Fix text -> computer_type enum conversion
-- =========================================================

create or replace function
public.create_computer_inventory_with_photos(
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
  v_photo_path text;
  v_sort_order integer := 0;
begin

  if v_actor is null then
    raise exception 'Authentication is required';
  end if;

  if not exists (
    select 1
    from public.profiles p
    join public.user_roles r
      on r.user_id = p.id
    where p.id = v_actor
      and p.is_active = true
      and r.role in (
        'owner',
        'manager',
        'computer_staff'
      )
  ) then
    raise exception
      'You do not have permission to create computer inventory';
  end if;

  if nullif(trim(p_model_name), '') is null then
    raise exception 'Computer model is required';
  end if;

  if nullif(trim(p_computer_type), '') is null then
    raise exception 'Computer type is required';
  end if;

  if p_purchase_price is null
     or p_purchase_price < 0
  then
    raise exception
      'Purchase price must be zero or greater';
  end if;

  if p_sale_price is null
     or p_sale_price < 0
  then
    raise exception
      'Sale price must be zero or greater';
  end if;

  if p_photo_paths is null
     or cardinality(p_photo_paths) < 2
  then
    raise exception
      'At least 2 computer photos are required';
  end if;

  if cardinality(p_photo_paths) > 6 then
    raise exception
      'A maximum of 6 computer photos is allowed';
  end if;


  -- =======================================================
  -- IMPORTANT FIX:
  -- p_computer_type is text.
  -- computer_type column is public.computer_type enum.
  -- =======================================================

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
    nullif(trim(p_serial_number), ''),
    nullif(trim(p_condition), ''),
    nullif(trim(p_purchase_from), ''),
    p_purchase_date,
    p_purchase_price,
    p_sale_price
  )
  returning id
  into v_computer_id;


  foreach v_photo_path in array p_photo_paths
  loop

    if nullif(trim(v_photo_path), '') is null then
      raise exception
        'Computer photo path cannot be empty';
    end if;

    insert into public.computer_inventory_photos (
      computer_id,
      storage_path,
      sort_order
    )
    values (
      v_computer_id,
      trim(v_photo_path),
      v_sort_order
    );

    v_sort_order :=
      v_sort_order + 1;

  end loop;


  return v_computer_id;

end;
$$;