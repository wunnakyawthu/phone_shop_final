-- Phase 2 security helpers and controlled transaction workflows.
--
-- IMPORTANT:
-- This migration is intended to be applied after:
--   001_extensions_and_enums.sql
--   002_identity_master_and_contacts.sql
--   003_inventory_and_financial_records.sql
--
-- Financial records are controlled through RPCs.
-- Direct mutation of completed financial records is blocked.
-- Owner-only correction/void workflows are explicit and auditable.
-- Browser-side access never receives privileged service-role credentials.

-- ============================================================
-- AUTH USER -> PROFILE
-- ============================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, 'Staff'), '@', 1)
    ),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();


-- ============================================================
-- AUTHORIZATION HELPERS
-- ============================================================

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_roles
  where user_id = auth.uid();
$$;


create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active
  );
$$;


create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_active_staff()
    and public.current_app_role() = 'owner';
$$;


create or replace function public.profile_can_access_category(
  p_user_id uuid,
  p_category public.product_category
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.user_roles r
      on r.user_id = p.id
    where p.id = p_user_id
      and p.is_active
      and (
        r.role = 'owner'
        or (
          r.role = 'phone_staff'
          and p_category = 'phone'
        )
        or (
          r.role = 'computer_staff'
          and p_category = 'computer'
        )
      )
  );
$$;


create or replace function public.can_access_category(
  p_category public.product_category
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.profile_can_access_category(
    auth.uid(),
    p_category
  );
$$;


create or replace function public.can_access_device(
  p_device_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.device_units d
    where d.id = p_device_id
      and public.can_access_category(d.category)
  );
$$;


create or replace function public.can_access_purchase(
  p_purchase_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.purchases p
    where p.id = p_purchase_id
      and public.can_access_category(p.category)
  );
$$;


create or replace function public.can_access_sale(
  p_sale_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_owner()
    or (
      exists (
        select 1
        from public.sale_items si
        join public.device_units d
          on d.id = si.device_unit_id
        where si.sale_id = p_sale_id
          and public.can_access_category(d.category)
      )
      and not exists (
        select 1
        from public.sale_items si
        join public.device_units d
          on d.id = si.device_unit_id
        where si.sale_id = p_sale_id
          and not public.can_access_category(d.category)
      )
    );
$$;


-- ============================================================
-- AUDIT EVENT HELPER
-- ============================================================

create or replace function public.audit_event(
  p_action public.audit_action,
  p_entity_type text,
  p_entity_id uuid,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;


-- ============================================================
-- FINANCIAL IMMUTABILITY
-- ============================================================

create or replace function public.prevent_financial_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception
      '% records are append-only and cannot be deleted',
      tg_table_name;
  end if;

  if old.status = 'completed'
     and current_setting(
       'app.allow_financial_mutation',
       true
     ) is distinct from 'on'
  then
    raise exception
      'Completed % records can only be changed through a controlled void/correction workflow',
      tg_table_name;
  end if;

  return new;
end;
$$;


create trigger purchases_immutable
before update or delete on public.purchases
for each row
execute function public.prevent_financial_mutation();


create trigger sales_immutable
before update or delete on public.sales
for each row
execute function public.prevent_financial_mutation();


-- ============================================================
-- FINANCIAL CHILD RECORD IMMUTABILITY
-- purchase_items, sale_items, sale_payments
-- ============================================================

create or replace function public.prevent_financial_child_mutation()
returns trigger
language plpgsql
as $$
declare
  parent_status public.financial_status;
begin

  if tg_table_name = 'purchase_items' then

    select p.status
    into parent_status
    from public.purchases p
    where p.id = coalesce(new.purchase_id, old.purchase_id);

  elsif tg_table_name = 'sale_items' then

    select s.status
    into parent_status
    from public.sales s
    where s.id = coalesce(new.sale_id, old.sale_id);

  elsif tg_table_name = 'sale_payments' then

    select s.status
    into parent_status
    from public.sales s
    where s.id = coalesce(new.sale_id, old.sale_id);

  else
    raise exception
      'Unsupported financial child table: %',
      tg_table_name;
  end if;

  if tg_op = 'DELETE' then
    raise exception
      '% records are append-only and cannot be deleted',
      tg_table_name;
  end if;

  if parent_status = 'completed'
     and current_setting(
       'app.allow_financial_mutation',
       true
     ) is distinct from 'on'
  then
    raise exception
      '% records belong to a completed financial transaction and cannot be changed',
      tg_table_name;
  end if;

  return new;
end;
$$;


create trigger purchase_items_immutable
before update or delete on public.purchase_items
for each row
execute function public.prevent_financial_child_mutation();


create trigger sale_items_immutable
before update or delete on public.sale_items
for each row
execute function public.prevent_financial_child_mutation();


create trigger sale_payments_immutable
before update or delete on public.sale_payments
for each row
execute function public.prevent_financial_child_mutation();


-- ============================================================
-- APPEND-ONLY TABLES
-- ============================================================

create or replace function public.prevent_append_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    '% is append-only and cannot be changed',
    tg_table_name;
end;
$$;


create trigger audit_logs_append_only
before update or delete on public.audit_logs
for each row
execute function public.prevent_append_mutation();


create trigger inventory_transactions_append_only
before update or delete on public.inventory_transactions
for each row
execute function public.prevent_append_mutation();


create trigger void_records_append_only
before update or delete on public.void_records
for each row
execute function public.prevent_append_mutation();


create trigger device_costs_append_only
before update or delete on public.device_costs
for each row
execute function public.prevent_append_mutation();


-- ============================================================
-- GENERIC MASTER-DATA / DEVICE AUDIT
-- ============================================================

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  action_value public.audit_action;
begin

  if tg_table_name = 'brands' then

    target_id := case
      when tg_op = 'DELETE' then old.id
      else new.id
    end;

    if tg_op = 'INSERT' then
      action_value := 'brand_created';
    else
      action_value := 'brand_updated';
    end if;

  elsif tg_table_name = 'product_models' then

    target_id := case
      when tg_op = 'DELETE' then old.id
      else new.id
    end;

    if tg_op = 'INSERT' then
      action_value := 'model_created';
    else
      action_value := 'model_updated';
    end if;

  elsif tg_table_name = 'device_units' then

    target_id := case
      when tg_op = 'DELETE' then old.id
      else new.id
    end;

    if tg_op = 'INSERT' then

      action_value := 'device_created';

    elsif tg_op = 'UPDATE'
          and new.is_publicly_visible
              is distinct from old.is_publicly_visible then

      action_value := 'device_published';

    else

      action_value := 'device_updated';

    end if;

  elsif tg_table_name = 'store_settings' then

    target_id := null;
    action_value := 'settings_updated';

  else
    return new;
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    auth.uid(),
    action_value,
    tg_table_name,
    target_id,
    jsonb_build_object(
      'operation',
      tg_op
    )
  );

  return new;
end;
$$;


create trigger brands_audit
after insert or update on public.brands
for each row
execute function public.audit_row_change();


create trigger product_models_audit
after insert or update on public.product_models
for each row
execute function public.audit_row_change();


create trigger device_units_audit
after insert or update on public.device_units
for each row
execute function public.audit_row_change();


create trigger store_settings_audit
after update on public.store_settings
for each row
execute function public.audit_row_change();


-- ============================================================
-- IDENTITY AUDIT
-- ============================================================

create or replace function public.audit_identity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if tg_table_name = 'profiles' then

    if tg_op = 'INSERT' then

      insert into public.audit_logs (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        details
      )
      values (
        auth.uid(),
        'user_created',
        'profiles',
        new.id,
        '{}'::jsonb
      );

    elsif tg_op = 'UPDATE'
          and new.is_active
              is distinct from old.is_active
          and not new.is_active then

      insert into public.audit_logs (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        details
      )
      values (
        auth.uid(),
        'user_deactivated',
        'profiles',
        new.id,
        '{}'::jsonb
      );

    end if;

  elsif tg_table_name = 'user_roles' then

    if tg_op = 'INSERT' then

      insert into public.audit_logs (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        details
      )
      values (
        auth.uid(),
        'role_changed',
        'user_roles',
        new.user_id,
        jsonb_build_object(
          'operation',
          'INSERT',
          'role',
          new.role
        )
      );

    elsif tg_op = 'UPDATE'
          and new.role is distinct from old.role then

      insert into public.audit_logs (
        actor_user_id,
        action,
        entity_type,
        entity_id,
        details
      )
      values (
        auth.uid(),
        'role_changed',
        'user_roles',
        new.user_id,
        jsonb_build_object(
          'operation',
          'UPDATE',
          'old_role',
          old.role,
          'new_role',
          new.role
        )
      );

    end if;

  end if;

  return new;
end;
$$;


create trigger profiles_audit
after insert or update on public.profiles
for each row
execute function public.audit_identity_change();


create trigger user_roles_audit
after insert or update on public.user_roles
for each row
execute function public.audit_identity_change();


-- ============================================================
-- PURCHASE RPC
-- ============================================================

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
      nullif(
        p_purchase ->> 'purchased_by_user_id',
        ''
      )::uuid,
      actor_id
    );

  checked_by uuid :=
    (p_purchase ->> 'checked_by_user_id')::uuid;

  seller_id uuid :=
    (p_purchase ->> 'seller_contact_id')::uuid;

  purchase_price bigint;
  sale_price bigint;
begin

  if not public.can_access_category(purchase_category) then
    raise exception
      'Not authorized for this product category';
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception
      'At least one purchase item is required';
  end if;

  if checked_by is null then
    raise exception
      'Checked By is required';
  end if;

  if not public.is_owner()
     and purchased_by <> actor_id
  then
    raise exception
      'Only an owner may override Purchased By';
  end if;

  if not public.profile_can_access_category(
    purchased_by,
    purchase_category
  )
  or not public.profile_can_access_category(
    checked_by,
    purchase_category
  )
  then
    raise exception
      'Assigned staff is not authorized for this category';
  end if;

  if not exists (
    select 1
    from public.contacts
    where id = seller_id
      and contact_type in ('seller', 'both')
      and is_active
  )
  then
    raise exception
      'A valid active seller is required';
  end if;


  insert into public.purchases (
    id,
    purchase_number,
    purchase_date,
    category,
    device_state,
    seller_contact_id,
    checked_by_user_id,
    purchased_by_user_id,
    notes,
    created_by
  )
  values (
    purchase_id,
    'PUR-'
      || to_char(
        timezone('utc', now()),
        'YYYYMMDD'
      )
      || '-'
      || upper(
        left(
          replace(
            purchase_id::text,
            '-',
            ''
          ),
          8
        )
      ),
    coalesce(
      (p_purchase ->> 'purchase_date')::timestamptz,
      timezone('utc', now())
    ),
    purchase_category,
    purchase_state,
    seller_id,
    checked_by,
    purchased_by,
    nullif(
      p_purchase ->> 'notes',
      ''
    ),
    actor_id
  );


  for item in
    select value
    from jsonb_array_elements(p_items)
  loop

    if (item ->> 'product_model_id') is null then
      raise exception
        'Each item requires a product model';
    end if;

    if (item ->> 'purchase_price_mmk') is null then
      raise exception
        'Each item requires a purchase price';
    end if;

    if (item ->> 'sale_price_mmk') is null then
      raise exception
        'Each item requires a sale price';
    end if;


    purchase_price :=
      (item ->> 'purchase_price_mmk')::bigint;

    sale_price :=
      (item ->> 'sale_price_mmk')::bigint;


    if purchase_price < 0 then
      raise exception
        'Purchase price cannot be negative';
    end if;

    if sale_price < 0 then
      raise exception
        'Sale price cannot be negative';
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
      nullif(
        item ->> 'color',
        ''
      ),
      nullif(
        item ->> 'ram_gb',
        ''
      )::smallint,
      nullif(
        item ->> 'storage_type',
        ''
      ),
      nullif(
        item ->> 'storage_capacity_gb',
        ''
      )::integer,
      nullif(
        item ->> 'imei_1',
        ''
      ),
      nullif(
        item ->> 'imei_2',
        ''
      ),
      nullif(
        item ->> 'serial_number',
        ''
      ),
      nullif(
        item ->> 'battery_health_percent',
        ''
      )::smallint,
      nullif(
        item ->> 'battery_cycle_count',
        ''
      )::integer,
      nullif(
        item ->> 'screen_size_inches',
        ''
      )::numeric,
      nullif(
        item ->> 'cpu_processor',
        ''
      ),
      nullif(
        item ->> 'gpu_graphics',
        ''
      ),
      nullif(
        item ->> 'condition',
        ''
      )::public.device_condition,
      nullif(
        item ->> 'important_message_type',
        ''
      )::public.important_message_type,
      nullif(
        item ->> 'important_message_other',
        ''
      ),
      nullif(
        item ->> 'internal_notes',
        ''
      ),
      actor_id,
      actor_id
    )
    returning id
    into device_id;


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
      nullif(
        item ->> 'notes',
        ''
      )
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
      'category',
      purchase_category,
      'item_count',
      jsonb_array_length(p_items),
      'purchased_by_user_id',
      purchased_by,
      'checked_by_user_id',
      checked_by
    )
  );

  return purchase_id;

end;
$$;


-- ============================================================
-- SALE RPC
-- ============================================================

create or replace function public.create_sale_with_items(
  p_sale jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  sale_id uuid := gen_random_uuid();

  item jsonb;
  device record;
  plan record;

  subtotal bigint := 0;
  discount_total bigint := 0;
  net_total bigint := 0;

  payment_amount bigint :=
    coalesce(
      nullif(
        p_sale ->> 'payment_amount_mmk',
        ''
      )::bigint,
      0
    );

  sold_by uuid :=
    coalesce(
      nullif(
        p_sale ->> 'sold_by_user_id',
        ''
      )::uuid,
      actor_id
    );

  method public.payment_method_code :=
    (p_sale ->> 'payment_method')::public.payment_method_code;

  item_sale_price bigint;
  item_discount bigint;
begin

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    raise exception
      'At least one sale item is required';
  end if;

  if not public.is_active_staff() then
    raise exception
      'Inactive users cannot create sales';
  end if;

  if not public.is_owner()
     and sold_by <> actor_id
  then
    raise exception
      'Only an owner may override Sold By';
  end if;

  if payment_amount < 0 then
    raise exception
      'Payment amount cannot be negative';
  end if;

  if not exists (
    select 1
    from public.payment_methods
    where code = method
      and is_enabled
  )
  then
    raise exception
      'Payment method is not available';
  end if;

  if nullif(
    p_sale ->> 'customer_contact_id',
    ''
  ) is not null
  and not exists (
    select 1
    from public.contacts
    where id = (
      p_sale ->> 'customer_contact_id'
    )::uuid
      and contact_type in ('customer', 'both')
      and is_active
  )
  then
    raise exception
      'Customer is not valid';
  end if;


  -- ----------------------------------------------------------
  -- FIRST PASS:
  -- Validate all devices and calculate totals.
  -- ----------------------------------------------------------

  for item in
    select value
    from jsonb_array_elements(p_items)
  loop

    select
      d.id,
      d.status,
      d.category,
      pi.purchase_price_mmk
    into device
    from public.device_units d
    join public.purchase_items pi
      on pi.device_unit_id = d.id
    where d.id = (
      item ->> 'device_unit_id'
    )::uuid
    for update;


    if not found
       or device.status <> 'in_stock'
    then
      raise exception
        'Selected device is not available';
    end if;


    if not public.can_access_category(
      device.category
    )
    then
      raise exception
        'Not authorized to sell this device category';
    end if;


    if not public.profile_can_access_category(
      sold_by,
      device.category
    )
    then
      raise exception
        'Sold By staff is not authorized for this product category';
    end if;


    if (item ->> 'unit_sale_price_mmk') is null then
      raise exception
        'Sale price is required for every item';
    end if;


    item_sale_price :=
      (item ->> 'unit_sale_price_mmk')::bigint;

    item_discount :=
      coalesce(
        nullif(
          item ->> 'discount_mmk',
          ''
        )::bigint,
        0
      );


    if item_sale_price < 0 then
      raise exception
        'Sale price cannot be negative';
    end if;


    if item_discount < 0 then
      raise exception
        'Discount cannot be negative';
    end if;


    if item_discount > item_sale_price then
      raise exception
        'Discount cannot exceed the item sale price';
    end if;


    subtotal :=
      subtotal + item_sale_price;

    discount_total :=
      discount_total + item_discount;

  end loop;


  net_total :=
    subtotal - discount_total;


  if net_total < 0 then
    raise exception
      'Net sale cannot be negative';
  end if;


  if payment_amount < net_total then
    raise exception
      'Payment amount must cover the net sale';
  end if;


  -- ----------------------------------------------------------
  -- CREATE SALE HEADER
  -- ----------------------------------------------------------

  insert into public.sales (
    id,
    invoice_number,
    sale_date,
    customer_contact_id,
    sold_by_user_id,
    subtotal_mmk,
    discount_total_mmk,
    net_sale_mmk,
    payment_amount_mmk,
    change_amount_mmk,
    notes,
    created_by
  )
  values (
    sale_id,
    'SAL-'
      || to_char(
        timezone('utc', now()),
        'YYYYMMDD'
      )
      || '-'
      || upper(
        left(
          replace(
            sale_id::text,
            '-',
            ''
          ),
          8
        )
      ),
    coalesce(
      (
        p_sale ->> 'sale_date'
      )::timestamptz,
      timezone('utc', now())
    ),
    nullif(
      p_sale ->> 'customer_contact_id',
      ''
    )::uuid,
    sold_by,
    subtotal,
    discount_total,
    net_total,
    payment_amount,
    payment_amount - net_total,
    nullif(
      p_sale ->> 'notes',
      ''
    ),
    actor_id
  );


  -- ----------------------------------------------------------
  -- SECOND PASS:
  -- Create sale items, update inventory, snapshot cost/warranty.
  -- ----------------------------------------------------------

  for item in
    select value
    from jsonb_array_elements(p_items)
  loop

    select
      d.id,
      d.category,
      pi.purchase_price_mmk
    into device
    from public.device_units d
    join public.purchase_items pi
      on pi.device_unit_id = d.id
    where d.id = (
      item ->> 'device_unit_id'
    )::uuid;


    if nullif(
      item ->> 'warranty_plan_id',
      ''
    ) is not null then

      select
        id,
        duration_days,
        customer_terms
      into plan
      from public.warranty_plans
      where id = (
        item ->> 'warranty_plan_id'
      )::uuid
        and is_active;

      if not found then
        raise exception
          'Warranty plan is not active';
      end if;

    else

      plan := null;

    end if;


    item_sale_price :=
      (item ->> 'unit_sale_price_mmk')::bigint;

    item_discount :=
      coalesce(
        nullif(
          item ->> 'discount_mmk',
          ''
        )::bigint,
        0
      );


    insert into public.sale_items (
      sale_id,
      device_unit_id,
      unit_sale_price_mmk,
      discount_mmk,
      net_sale_mmk,
      purchase_cost_snapshot_mmk,
      warranty_plan_id,
      warranty_duration_days_snapshot,
      warranty_terms_snapshot
    )
    values (
      sale_id,
      device.id,
      item_sale_price,
      item_discount,
      item_sale_price - item_discount,
      device.purchase_price_mmk,
      plan.id,
      plan.duration_days,
      plan.customer_terms
    );


    update public.device_units
    set
      status = 'sold',
      is_publicly_visible = false,
      updated_by = actor_id
    where id = device.id;


    insert into public.inventory_transactions (
      device_unit_id,
      transaction_type,
      status_before,
      status_after,
      sale_id,
      performed_by
    )
    values (
      device.id,
      'sale_completed',
      'in_stock',
      'sold',
      sale_id,
      actor_id
    );

  end loop;


  -- One payment method in V1.
  insert into public.sale_payments (
    sale_id,
    method,
    amount_mmk
  )
  values (
    sale_id,
    method,
    payment_amount
  );


  perform public.audit_event(
    'sale_created',
    'sales',
    sale_id,
    jsonb_build_object(
      'item_count',
      jsonb_array_length(p_items),
      'payment_method',
      method,
      'sold_by_user_id',
      sold_by,
      'subtotal_mmk',
      subtotal,
      'discount_total_mmk',
      discount_total,
      'net_sale_mmk',
      net_total
    )
  );

  return sale_id;

end;
$$;


-- ============================================================
-- VOID SALE
-- ============================================================

create or replace function public.void_sale(
  p_sale_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  actor_id uuid := auth.uid();
begin

  if not public.is_owner() then
    raise exception
      'Only the owner can void sales';
  end if;


  if char_length(
       trim(coalesce(p_reason, ''))
     ) < 3
  then
    raise exception
      'A void reason is required';
  end if;


  perform 1
  from public.sales
  where id = p_sale_id
    and status = 'completed'
  for update;

  if not found then
    raise exception
      'Completed sale not found';
  end if;


  -- A sale can only be safely voided when each sold device has
  -- no later inventory transaction after the sale transaction.
  if exists (
    select 1
    from public.sale_items si
    join public.inventory_transactions sale_tx
      on sale_tx.device_unit_id = si.device_unit_id
     and sale_tx.sale_id = p_sale_id
     and sale_tx.transaction_type = 'sale_completed'
    where si.sale_id = p_sale_id
      and exists (
        select 1
        from public.inventory_transactions later_tx
        where later_tx.device_unit_id = si.device_unit_id
          and later_tx.created_at > sale_tx.created_at
      )
  )
  then
    raise exception
      'Sale cannot be voided because inventory has subsequent transactions';
  end if;


  -- Device costs incurred after the sale are also considered
  -- subsequent activity and block an automatic sale reversal.
  if exists (
    select 1
    from public.sale_items si
    where si.sale_id = p_sale_id
      and exists (
        select 1
        from public.device_costs dc
        join public.inventory_transactions sale_tx
          on sale_tx.device_unit_id = dc.device_unit_id
         and sale_tx.sale_id = p_sale_id
         and sale_tx.transaction_type = 'sale_completed'
        where dc.device_unit_id = si.device_unit_id
          and dc.incurred_at > sale_tx.created_at
      )
  )
  then
    raise exception
      'Sale cannot be voided because device costs were recorded after the sale';
  end if;


  perform set_config(
    'app.allow_financial_mutation',
    'on',
    true
  );


  update public.sales
  set status = 'voided'
  where id = p_sale_id;


  insert into public.void_records (
    target_type,
    sale_id,
    reason,
    voided_by
  )
  values (
    'sale',
    p_sale_id,
    p_reason,
    actor_id
  );


  for item in
    select device_unit_id
    from public.sale_items
    where sale_id = p_sale_id
  loop

    update public.device_units
    set
      status = 'in_stock',
      is_publicly_visible = false,
      updated_by = actor_id
    where id = item.device_unit_id
      and status = 'sold';


    if not found then
      raise exception
        'Device % is no longer in sold state',
        item.device_unit_id;
    end if;


    insert into public.inventory_transactions (
      device_unit_id,
      transaction_type,
      status_before,
      status_after,
      sale_id,
      reason,
      performed_by
    )
    values (
      item.device_unit_id,
      'void_sale',
      'sold',
      'in_stock',
      p_sale_id,
      p_reason,
      actor_id
    );

  end loop;


  perform public.audit_event(
    'sale_voided',
    'sales',
    p_sale_id,
    jsonb_build_object(
      'reason',
      p_reason
    )
  );

end;
$$;


-- ============================================================
-- VOID PURCHASE
-- ============================================================

create or replace function public.void_purchase(
  p_purchase_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  actor_id uuid := auth.uid();
begin

  if not public.is_owner() then
    raise exception
      'Only the owner can void purchases';
  end if;


  if char_length(
       trim(coalesce(p_reason, ''))
     ) < 3
  then
    raise exception
      'A void reason is required';
  end if;


  perform 1
  from public.purchases
  where id = p_purchase_id
    and status = 'completed'
  for update;

  if not found then
    raise exception
      'Completed purchase not found';
  end if;


  -- A purchase cannot be voided while any of its devices
  -- belongs to a still-completed sale.
  if exists (
    select 1
    from public.purchase_items pi
    join public.sale_items si
      on si.device_unit_id = pi.device_unit_id
    join public.sales s
      on s.id = si.sale_id
     and s.status = 'completed'
    where pi.purchase_id = p_purchase_id
  )
  then
    raise exception
      'Void the completed sale before voiding its purchase';
  end if;


  -- Do not silently invalidate a device that has later inventory activity.
  if exists (
    select 1
    from public.purchase_items pi
    join public.inventory_transactions purchase_tx
      on purchase_tx.device_unit_id = pi.device_unit_id
     and purchase_tx.purchase_id = p_purchase_id
     and purchase_tx.transaction_type = 'purchase_received'
    where pi.purchase_id = p_purchase_id
      and exists (
        select 1
        from public.inventory_transactions later_tx
        where later_tx.device_unit_id = pi.device_unit_id
          and later_tx.created_at > purchase_tx.created_at
          and later_tx.transaction_type <> 'void_sale'
      )
  )
  then
    raise exception
      'Purchase cannot be voided because inventory has subsequent transactions';
  end if;


  perform set_config(
    'app.allow_financial_mutation',
    'on',
    true
  );


  update public.purchases
  set status = 'voided'
  where id = p_purchase_id;


  insert into public.void_records (
    target_type,
    purchase_id,
    reason,
    voided_by
  )
  values (
    'purchase',
    p_purchase_id,
    p_reason,
    actor_id
  );


  for item in
    select device_unit_id
    from public.purchase_items
    where purchase_id = p_purchase_id
  loop

    update public.device_units
    set
      status = 'voided',
      is_publicly_visible = false,
      updated_by = actor_id
    where id = item.device_unit_id
      and status = 'in_stock';


    if not found then
      raise exception
        'Device % is not in stock and cannot be voided with its purchase',
        item.device_unit_id;
    end if;


    insert into public.inventory_transactions (
      device_unit_id,
      transaction_type,
      status_before,
      status_after,
      purchase_id,
      reason,
      performed_by
    )
    values (
      item.device_unit_id,
      'void_purchase',
      'in_stock',
      'voided',
      p_purchase_id,
      p_reason,
      actor_id
    );

  end loop;


  perform public.audit_event(
    'purchase_voided',
    'purchases',
    p_purchase_id,
    jsonb_build_object(
      'reason',
      p_reason
    )
  );

end;
$$;


-- ============================================================
-- CONTROLLED INVENTORY CORRECTION
-- ============================================================

create or replace function public.correct_inventory_status(
  p_device_id uuid,
  p_new_status public.inventory_status,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_status public.inventory_status;
  actor_id uuid := auth.uid();
begin

  if not public.is_owner() then
    raise exception
      'Only the owner can correct inventory';
  end if;


  if char_length(
       trim(coalesce(p_reason, ''))
     ) < 3
  then
    raise exception
      'A correction reason is required';
  end if;


  if p_new_status not in (
    'in_stock',
    'voided'
  )
  then
    raise exception
      'Invalid correction status. Use in_stock or voided';
  end if;


  select status
  into old_status
  from public.device_units
  where id = p_device_id
  for update;


  if not found then
    raise exception
      'Device not found';
  end if;


  if old_status = 'sold' then
    raise exception
      'Sold inventory must be corrected through a sale void, not a direct adjustment';
  end if;


  if old_status = p_new_status then
    raise exception
      'Device already has the requested inventory status';
  end if;


  update public.device_units
  set
    status = p_new_status,
    is_publicly_visible = false,
    updated_by = actor_id
  where id = p_device_id;


  insert into public.inventory_transactions (
    device_unit_id,
    transaction_type,
    status_before,
    status_after,
    reason,
    performed_by
  )
  values (
    p_device_id,
    'correction',
    old_status,
    p_new_status,
    p_reason,
    actor_id
  );


  perform public.audit_event(
    'inventory_corrected',
    'device_units',
    p_device_id,
    jsonb_build_object(
      'from_status',
      old_status,
      'to_status',
      p_new_status,
      'reason',
      p_reason
    )
  );

end;
$$;


-- ============================================================
-- PUBLICATION CONTROL
-- ============================================================

create or replace function public.set_device_publication(
  p_device_id uuid,
  p_is_public boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin

  if not public.is_owner() then
    raise exception
      'Only the owner can change public catalog visibility';
  end if;


  update public.device_units
  set
    is_publicly_visible = p_is_public,
    updated_by = actor_id
  where id = p_device_id
    and (
      not p_is_public
      or status = 'in_stock'
    );


  if not found then
    raise exception
      'Only in-stock devices can be published';
  end if;

end;
$$;


-- ============================================================
-- SAFE SALE ITEM VIEW FOR AUTHORIZED STAFF
-- NEVER RETURNS PURCHASE COST SNAPSHOT
-- ============================================================

create or replace function public.get_authorized_sale_items(
  p_sale_id uuid
)
returns table (
  sale_id uuid,
  device_id uuid,
  category public.product_category,
  unit_sale_price_mmk bigint,
  discount_mmk bigint,
  net_sale_mmk bigint,
  warranty_duration_days integer,
  warranty_terms text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    si.sale_id,
    d.id,
    d.category,
    si.unit_sale_price_mmk,
    si.discount_mmk,
    si.net_sale_mmk,
    si.warranty_duration_days_snapshot,
    si.warranty_terms_snapshot
  from public.sale_items si
  join public.device_units d
    on d.id = si.device_unit_id
  where si.sale_id = p_sale_id
    and public.can_access_sale(p_sale_id)
    and public.can_access_category(d.category);
$$;