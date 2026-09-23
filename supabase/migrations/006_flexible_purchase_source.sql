-- Flexible source information for real-world purchases.
-- Walk-in sellers may decline to provide personal data, so seller contact is optional.

alter table public.purchases
  alter column seller_contact_id drop not null;

alter table public.purchases
  add column if not exists seller_name_snapshot text,
  add column if not exists seller_phone_snapshot text;

create index if not exists purchases_source_phone_idx
  on public.purchases (seller_phone_snapshot)
  where seller_phone_snapshot is not null;

create or replace function public.create_purchase_with_devices(
  p_purchase jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  purchase_id uuid := gen_random_uuid();

  item jsonb;
  device_id uuid;

  purchase_category public.product_category :=
    (p_purchase ->> 'category')::public.product_category;

  purchase_state public.device_state :=
    (p_purchase ->> 'device_state')::public.device_state;

  purchased_by uuid :=
    coalesce(
      nullif(p_purchase ->> 'purchased_by_user_id', '')::uuid,
      actor_id
    );

  checked_by uuid :=
    nullif(p_purchase ->> 'checked_by_user_id', '')::uuid;

  seller_id uuid :=
    nullif(p_purchase ->> 'seller_contact_id', '')::uuid;

  seller_name text :=
    nullif(trim(coalesce(p_purchase ->> 'seller_name', '')), '');

  seller_phone text :=
    nullif(trim(coalesce(p_purchase ->> 'seller_phone', '')), '');

  purchase_price bigint;
  sale_price bigint;
begin

  if not public.can_access_category(purchase_category) then
    raise exception 'Not authorized for this product category';
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception 'At least one purchase item is required';
  end if;

  if checked_by is null then
    raise exception 'Checked By is required';
  end if;

  if not public.is_owner()
     and purchased_by <> actor_id
  then
    raise exception 'Only an owner may override Purchased By';
  end if;

  if not public.profile_can_access_category(purchased_by, purchase_category)
     or not public.profile_can_access_category(checked_by, purchase_category)
  then
    raise exception 'Assigned staff is not authorized for this category';
  end if;

  if seller_id is not null and not exists (
    select 1
    from public.contacts
    where id = seller_id
      and contact_type in ('seller', 'both')
      and is_active
  ) then
    raise exception 'Selected seller is not valid or active';
  end if;

  insert into public.purchases (
    id,
    purchase_number,
    purchase_date,
    category,
    device_state,
    seller_contact_id,
    seller_name_snapshot,
    seller_phone_snapshot,
    checked_by_user_id,
    purchased_by_user_id,
    notes,
    created_by
  )
  values (
    purchase_id,
    'PUR-'
      || to_char(timezone('utc', now()), 'YYYYMMDD')
      || '-'
      || upper(left(replace(purchase_id::text, '-', ''), 8)),
    coalesce(
      (p_purchase ->> 'purchase_date')::timestamptz,
      timezone('utc', now())
    ),
    purchase_category,
    purchase_state,
    seller_id,
    seller_name,
    seller_phone,
    checked_by,
    purchased_by,
    nullif(p_purchase ->> 'notes', ''),
    actor_id
  );

  for item in
    select value from jsonb_array_elements(p_items)
  loop
    if (item ->> 'product_model_id') is null then
      raise exception 'Each item requires a product model';
    end if;

    if (item ->> 'purchase_price_mmk') is null then
      raise exception 'Each item requires a purchase price';
    end if;

    if (item ->> 'sale_price_mmk') is null then
      raise exception 'Each item requires a sale price';
    end if;

    purchase_price := (item ->> 'purchase_price_mmk')::bigint;
    sale_price := (item ->> 'sale_price_mmk')::bigint;

    if purchase_price < 0 then
      raise exception 'Purchase price cannot be negative';
    end if;

    if sale_price < 0 then
      raise exception 'Sale price cannot be negative';
    end if;

    insert into public.device_units (
      product_model_id,
      category,
      device_state,
      sale_price_mmk,
      color,
      ram_gb,
      storage_type,
      storage_capacity_gb,
      imei_1,
      imei_2,
      serial_number,
      battery_health_percent,
      battery_cycle_count,
      screen_size_inches,
      cpu_processor,
      gpu_graphics,
      condition,
      important_message_type,
      important_message_other,
      internal_notes,
      created_by,
      updated_by
    )
    values (
      (item ->> 'product_model_id')::uuid,
      purchase_category,
      purchase_state,
      sale_price,
      nullif(item ->> 'color', ''),
      nullif(item ->> 'ram_gb', '')::smallint,
      nullif(item ->> 'storage_type', ''),
      nullif(item ->> 'storage_capacity_gb', '')::integer,
      nullif(item ->> 'imei_1', ''),
      nullif(item ->> 'imei_2', ''),
      nullif(item ->> 'serial_number', ''),
      nullif(item ->> 'battery_health_percent', '')::smallint,
      nullif(item ->> 'battery_cycle_count', '')::integer,
      nullif(item ->> 'screen_size_inches', '')::numeric,
      nullif(item ->> 'cpu_processor', ''),
      nullif(item ->> 'gpu_graphics', ''),
      nullif(item ->> 'condition', '')::public.device_condition,
      nullif(item ->> 'important_message_type', '')::public.important_message_type,
      nullif(item ->> 'important_message_other', ''),
      nullif(item ->> 'internal_notes', ''),
      actor_id,
      actor_id
    )
    returning id into device_id;

    insert into public.purchase_items (
      purchase_id,
      device_unit_id,
      purchase_price_mmk,
      notes
    )
    values (
      purchase_id,
      device_id,
      purchase_price,
      nullif(item ->> 'notes', '')
    );

    insert into public.inventory_transactions (
      device_unit_id,
      transaction_type,
      status_before,
      status_after,
      purchase_id,
      performed_by
    )
    values (
      device_id,
      'purchase_received',
      null,
      'in_stock',
      purchase_id,
      actor_id
    );
  end loop;

  perform public.audit_event(
    'purchase_created',
    'purchases',
    purchase_id,
    jsonb_build_object(
      'category', purchase_category,
      'item_count', jsonb_array_length(p_items),
      'purchased_by_user_id', purchased_by,
      'checked_by_user_id', checked_by,
      'source_information_provided', (seller_id is not null or seller_name is not null or seller_phone is not null)
    )
  );

  return purchase_id;
end;
$$;
