-- Allow phone purchases to be saved with 0 to 6 photos.
-- Existing edit/publication rules are intentionally left unchanged.

create or replace function public.create_purchase_with_devices_and_photos(
  p_purchase jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_actor_id uuid := auth.uid();
  v_purchase_id uuid;
  v_item jsonb;
  v_device_id uuid;
  v_photo_path text;
  v_photo_index integer;
  v_photos jsonb;
  v_region text;
begin
  if v_actor_id is null or not public.is_active_staff() then
    raise exception 'Authentication is required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one device is required';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_photos := coalesce(v_item -> 'photo_paths', '[]'::jsonb);

    if jsonb_typeof(v_photos) <> 'array'
       or jsonb_array_length(v_photos) > 6 then
      raise exception 'Each device can have at most 6 photos';
    end if;
  end loop;

  v_purchase_id := public.create_purchase_with_devices(p_purchase, p_items);

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_device_id := null;

    select d.id
      into v_device_id
    from public.purchase_items as pi
    join public.device_units as d
      on d.id = pi.device_unit_id
    where pi.purchase_id = v_purchase_id
      and regexp_replace(coalesce(d.imei_1, ''), '[^0-9A-Za-z]', '', 'g') =
          regexp_replace(coalesce(v_item ->> 'imei_1', ''), '[^0-9A-Za-z]', '', 'g')
    limit 1;

    if v_device_id is null then
      raise exception 'Could not match purchased device for photo attachment';
    end if;

    v_region := upper(
      nullif(
        regexp_replace(
          trim(coalesce(v_item ->> 'iphone_region_code', '')),
          '[[:space:]]+',
          '',
          'g'
        ),
        ''
      )
    );

    if v_region is not null then
      update public.device_units as du
      set
        iphone_region_code = v_region,
        updated_by = v_actor_id
      where du.id = v_device_id;
    end if;

    v_photos := coalesce(v_item -> 'photo_paths', '[]'::jsonb);
    v_photo_index := 0;

    for v_photo_path in
      select jsonb_array_elements_text(v_photos)
    loop
      insert into public.device_photos (
        device_unit_id,
        storage_path,
        is_public,
        sort_order,
        created_by
      ) values (
        v_device_id,
        v_photo_path,
        true,
        v_photo_index,
        v_actor_id
      );

      v_photo_index := v_photo_index + 1;
    end loop;

    update public.device_units as du
    set
      -- A phone with no photo remains internal inventory.
      -- One or more photos may be shown publicly.
      is_publicly_visible = (jsonb_array_length(v_photos) > 0),
      updated_by = v_actor_id
    where du.id = v_device_id
      and du.status = 'in_stock';
  end loop;

  return v_purchase_id;
end;
$$;

revoke all on function public.create_purchase_with_devices_and_photos(jsonb, jsonb) from public;
grant execute on function public.create_purchase_with_devices_and_photos(jsonb, jsonb) to authenticated;
