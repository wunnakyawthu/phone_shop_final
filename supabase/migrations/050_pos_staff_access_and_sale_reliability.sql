-- POS reliability fixes:
-- 1. Staff can read only the receipt fields needed by POS without opening
--    owner-only store settings.
-- 2. Sales validate category permission and commit the voucher, item snapshots,
--    warranty, customer and inventory status in one atomic transaction.

create or replace function public.get_pos_store_settings()
returns table (
  store_name text,
  phone text,
  address text,
  receipt_footer text,
  warranty_terms text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_active_staff() then
    raise exception 'Only active staff can use POS';
  end if;

  return query
  select s.store_name,
         coalesce(s.phone, ''),
         coalesce(s.address, ''),
         coalesce(s.receipt_footer, 'Thank you for your purchase.'),
         coalesce(s.warranty_terms, '')
  from public.store_settings s
  where s.id = true
  limit 1;
end;
$$;

revoke all on function public.get_pos_store_settings() from public;
grant execute on function public.get_pos_store_settings() to authenticated;

create or replace function public.create_pos_sale_v3(
  p_category public.product_category,
  p_sale jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  new_sale_id uuid := gen_random_uuid();
  customer_id uuid;
  customer_name text := nullif(trim(coalesce(p_sale->>'customer_name', '')), '');
  customer_phone text := nullif(trim(coalesce(p_sale->>'customer_phone', '')), '');
  warranty_terms text := coalesce(p_sale->>'warranty_terms', '');
  warranty_days integer := coalesce(nullif(p_sale->>'warranty_duration_days', '')::integer, 30);
  payment public.payment_method_code;
  item jsonb;
  inventory_id uuid;
  row_data record;
  price bigint;
  cost bigint;
  discount_percent numeric(5,2);
  discount_amount bigint;
  subtotal bigint := 0;
  discount_total bigint := 0;
  invoice text;
  changed_rows integer;
begin
  if not public.is_active_staff() then
    raise exception 'Your staff account is inactive';
  end if;
  if not public.can_access_category(p_category) then
    raise exception 'You do not have permission to sell this device category';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one item to the sale';
  end if;
  if warranty_days < 0 or warranty_days > 3650 then
    raise exception 'Warranty duration must be between 0 and 3650 days';
  end if;

  begin
    payment := coalesce(nullif(p_sale->>'payment_method', ''), 'cash')::public.payment_method_code;
  exception when invalid_text_representation then
    raise exception 'Invalid payment method';
  end;

  -- Lock every selected device and calculate totals before creating the voucher.
  for item in select value from jsonb_array_elements(p_items)
  loop
    begin
      inventory_id := (item->>'inventory_id')::uuid;
      price := (item->>'unit_price_mmk')::bigint;
      discount_percent := coalesce(nullif(item->>'discount_percent', '')::numeric, 0);
    exception when others then
      raise exception 'A sale item contains invalid data';
    end;

    if price < 0 or discount_percent < 0 or discount_percent > 50 then
      raise exception 'Price or discount is outside the allowed range';
    end if;

    if p_category = 'phone' then
      select d.id, d.status::text as status
      into row_data
      from public.device_units d
      where d.id = inventory_id and d.category = 'phone'
      for update;
    else
      select c.id, c.status::text as status
      into row_data
      from public.computer_inventory_items c
      where c.id = inventory_id and c.is_deleted = false
      for update;
    end if;

    if not found or row_data.status <> 'in_stock' then
      raise exception 'Selected item is no longer in stock';
    end if;

    discount_amount := round(price * discount_percent / 100.0);
    subtotal := subtotal + price;
    discount_total := discount_total + discount_amount;
  end loop;

  if customer_phone is not null then
    select c.id into customer_id
    from public.contacts c
    where c.phone_number = customer_phone and c.is_active
    order by c.created_at
    limit 1;

    if customer_id is null then
      insert into public.contacts(
        full_name, phone_number, contact_type, created_by, updated_by
      ) values (
        coalesce(customer_name, 'Customer'), customer_phone, 'customer', actor, actor
      ) returning id into customer_id;
    else
      update public.contacts
      set full_name = coalesce(customer_name, full_name),
          contact_type = case
            when contact_type = 'seller' then 'both'::public.contact_type
            else contact_type
          end,
          updated_by = actor
      where id = customer_id;
    end if;
  end if;

  invoice := (case when p_category = 'phone' then 'PH' else 'PC' end)
    || '-' || to_char(timezone('utc', now()), 'YYYYMMDD')
    || '-' || upper(left(replace(new_sale_id::text, '-', ''), 6));

  insert into public.pos_sales(
    id, invoice_number, category, customer_contact_id,
    customer_name_snapshot, customer_phone_snapshot,
    subtotal_mmk, discount_total_mmk, net_total_mmk,
    payment_method, notes, sold_by
  ) values (
    new_sale_id, invoice, p_category, customer_id,
    coalesce(customer_name, 'Walk-in customer'), customer_phone,
    subtotal, discount_total, subtotal - discount_total,
    payment, nullif(trim(coalesce(p_sale->>'notes', '')), ''), actor
  );

  for item in select value from jsonb_array_elements(p_items)
  loop
    inventory_id := (item->>'inventory_id')::uuid;
    price := (item->>'unit_price_mmk')::bigint;
    discount_percent := coalesce(nullif(item->>'discount_percent', '')::numeric, 0);
    discount_amount := round(price * discount_percent / 100.0);

    if p_category = 'phone' then
      select d.id,
             trim(b.name || ' ' || m.name) as product_name,
             d.imei_1 as serial,
             coalesce(pi.purchase_price_mmk, 0)::bigint as purchase_cost
      into strict row_data
      from public.device_units d
      join public.product_models m on m.id = d.product_model_id
      join public.brands b on b.id = m.brand_id
      left join public.purchase_items pi on pi.device_unit_id = d.id
      where d.id = inventory_id;

      cost := row_data.purchase_cost;
      insert into public.pos_sale_items(
        sale_id, device_unit_id, product_name_snapshot, serial_snapshot,
        unit_price_mmk, discount_percent, discount_mmk, net_price_mmk,
        warranty_terms_snapshot, purchase_cost_snapshot_mmk,
        warranty_duration_days, warranty_expires_at
      ) values (
        new_sale_id, row_data.id, row_data.product_name, row_data.serial,
        price, discount_percent, discount_amount, price - discount_amount,
        warranty_terms, cost, warranty_days,
        timezone('utc', now()) + make_interval(days => warranty_days)
      );

      update public.device_units
      set status = 'sold', is_publicly_visible = false, updated_by = actor
      where id = inventory_id and status = 'in_stock';
    else
      select c.id,
             trim(coalesce(c.brand, '') || ' ' || coalesce(c.model_name, 'Computer')) as product_name,
             c.serial_number as serial,
             coalesce(c.purchase_price, 0)::bigint as purchase_cost
      into strict row_data
      from public.computer_inventory_items c
      where c.id = inventory_id and c.is_deleted = false;

      cost := row_data.purchase_cost;
      insert into public.pos_sale_items(
        sale_id, computer_inventory_item_id, product_name_snapshot, serial_snapshot,
        unit_price_mmk, discount_percent, discount_mmk, net_price_mmk,
        warranty_terms_snapshot, purchase_cost_snapshot_mmk,
        warranty_duration_days, warranty_expires_at
      ) values (
        new_sale_id, row_data.id, row_data.product_name, row_data.serial,
        price, discount_percent, discount_amount, price - discount_amount,
        warranty_terms, cost, warranty_days,
        timezone('utc', now()) + make_interval(days => warranty_days)
      );

      update public.computer_inventory_items
      set status = 'sold', is_publicly_visible = false
      where id = inventory_id and status = 'in_stock' and is_deleted = false;
    end if;

    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then
      raise exception 'Selected item changed while completing the sale. Please retry';
    end if;
  end loop;

  return new_sale_id;
exception
  when unique_violation then
    raise exception 'One of the selected items was already sold. Refresh POS and try again';
  when no_data_found then
    raise exception 'A selected inventory item could not be found';
end;
$$;

revoke all on function public.create_pos_sale_v3(public.product_category, jsonb, jsonb) from public;
grant execute on function public.create_pos_sale_v3(public.product_category, jsonb, jsonb) to authenticated;
