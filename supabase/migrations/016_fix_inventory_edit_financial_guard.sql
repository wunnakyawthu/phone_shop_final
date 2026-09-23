-- Fix phone inventory editing after a completed purchase.
-- Reordering/editing photos or non-financial device fields must not touch purchase_items.
-- Owner purchase-cost corrections remain allowed through this controlled RPC only.

create or replace function public.update_phone_inventory_device(
  p_device_id uuid,
  p_patch jsonb,
  p_photo_paths jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_old_purchase_price bigint;
  v_new_purchase_price bigint;
  v_purchase_price_changed boolean := false;
  v_is_public boolean;
  v_path text;
  v_index integer := 0;
begin
  if v_actor is null or not public.can_access_device(p_device_id) then
    raise exception 'You do not have permission to edit this phone';
  end if;

  if not exists (
    select 1 from public.device_units
    where id = p_device_id and category = 'phone'
  ) then
    raise exception 'Phone not found';
  end if;

  if jsonb_typeof(p_photo_paths) <> 'array'
     or jsonb_array_length(p_photo_paths) < 2
     or jsonb_array_length(p_photo_paths) > 6 then
    raise exception 'Each public phone requires between 2 and 6 photos';
  end if;

  select pi.purchase_price_mmk
    into v_old_purchase_price
  from public.purchase_items pi
  where pi.device_unit_id = p_device_id;

  if p_patch ? 'purchase_price_mmk' then
    v_new_purchase_price := nullif(p_patch ->> 'purchase_price_mmk', '')::bigint;
    if v_new_purchase_price is not null and v_new_purchase_price < 0 then
      raise exception 'Purchase price cannot be negative';
    end if;

    v_purchase_price_changed := v_new_purchase_price is distinct from v_old_purchase_price;

    if v_purchase_price_changed and not public.is_owner() then
      raise exception 'Only the owner can change purchase cost';
    end if;
  else
    v_new_purchase_price := v_old_purchase_price;
  end if;

  update public.device_units d
  set
    product_model_id = coalesce(nullif(p_patch ->> 'product_model_id', '')::uuid, d.product_model_id),
    color = case when p_patch ? 'color' then nullif(trim(p_patch ->> 'color'), '') else d.color end,
    storage_capacity_gb = case when p_patch ? 'storage_capacity_gb' then nullif(p_patch ->> 'storage_capacity_gb', '')::integer else d.storage_capacity_gb end,
    ram_gb = case when p_patch ? 'ram_gb' then nullif(p_patch ->> 'ram_gb', '')::smallint else d.ram_gb end,
    imei_1 = case when p_patch ? 'imei_1' then nullif(trim(p_patch ->> 'imei_1'), '') else d.imei_1 end,
    imei_2 = case when p_patch ? 'imei_2' then nullif(trim(p_patch ->> 'imei_2'), '') else d.imei_2 end,
    iphone_region_code = case when p_patch ? 'iphone_region_code' then upper(nullif(trim(p_patch ->> 'iphone_region_code'), '')) else d.iphone_region_code end,
    battery_health_percent = case when p_patch ? 'battery_health_percent' then nullif(p_patch ->> 'battery_health_percent', '')::smallint else d.battery_health_percent end,
    important_message_type = case when p_patch ? 'important_message_type' then nullif(p_patch ->> 'important_message_type', '')::public.important_message_type else d.important_message_type end,
    important_message_other = case when p_patch ? 'important_message_other' then nullif(trim(p_patch ->> 'important_message_other'), '') else d.important_message_other end,
    internal_notes = case when p_patch ? 'internal_notes' then nullif(trim(p_patch ->> 'internal_notes'), '') else d.internal_notes end,
    sale_price_mmk = case when p_patch ? 'sale_price_mmk' then (p_patch ->> 'sale_price_mmk')::bigint else d.sale_price_mmk end,
    is_publicly_visible = case when p_patch ? 'is_publicly_visible' then (p_patch ->> 'is_publicly_visible')::boolean else d.is_publicly_visible end,
    updated_by = v_actor
  where d.id = p_device_id;

  -- Do not update immutable financial child rows when the cost did not change.
  -- If the owner intentionally changes the purchase cost, allow only this transaction-scoped correction.
  if v_purchase_price_changed then
    perform set_config('app.allow_financial_mutation', 'on', true);

    update public.purchase_items
    set purchase_price_mmk = v_new_purchase_price
    where device_unit_id = p_device_id;
  end if;

  select is_publicly_visible into v_is_public
  from public.device_units where id = p_device_id;

  delete from public.device_photos where device_unit_id = p_device_id;

  for v_path in select jsonb_array_elements_text(p_photo_paths)
  loop
    insert into public.device_photos(device_unit_id, storage_path, is_public, sort_order, created_by)
    values (p_device_id, v_path, true, v_index, v_actor);
    v_index := v_index + 1;
  end loop;

  if v_is_public and v_index < 2 then
    raise exception 'At least 2 photos are required for website publication';
  end if;

  perform public.audit_event(
    'device_updated',
    'device_unit',
    p_device_id,
    jsonb_build_object(
      'source', 'inventory_edit',
      'purchase_price_changed', v_purchase_price_changed
    )
  );
end;
$$;

revoke all on function public.update_phone_inventory_device(uuid, jsonb, jsonb) from public;
grant execute on function public.update_phone_inventory_device(uuid, jsonb, jsonb) to authenticated;
