create table public.device_units (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null unique default gen_random_uuid(),
  product_model_id uuid not null references public.product_models(id) on delete restrict,
  category public.product_category not null,
  device_state public.device_state not null,
  status public.inventory_status not null default 'in_stock',
  sale_price_mmk bigint not null check (sale_price_mmk >= 0),
  color text,
  ram_gb smallint check (ram_gb > 0),
  storage_type text,
  storage_capacity_gb integer check (storage_capacity_gb > 0),
  imei_1 text,
  imei_2 text,
  serial_number text,
  battery_health_percent smallint check (battery_health_percent between 0 and 100),
  battery_cycle_count integer check (battery_cycle_count >= 0),
  screen_size_inches numeric(4,1) check (screen_size_inches > 0),
  cpu_processor text,
  gpu_graphics text,
  condition public.device_condition,
  important_message_type public.important_message_type,
  important_message_other text,
  internal_notes text,
  public_title_override text,
  is_publicly_visible boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((category = 'phone' and imei_1 is not null and serial_number is null) or (category = 'computer' and serial_number is not null and imei_1 is null and imei_2 is null)),
  check (device_state = 'used' or condition is null),
  check ((important_message_type = 'other' and nullif(trim(important_message_other), '') is not null) or (important_message_type is distinct from 'other' and important_message_other is null)),
  check (not is_publicly_visible or status = 'in_stock')
);

create unique index device_units_imei_1_unique on public.device_units ((regexp_replace(imei_1, '[^0-9A-Za-z]', '', 'g'))) where imei_1 is not null;
create unique index device_units_imei_2_unique on public.device_units ((regexp_replace(imei_2, '[^0-9A-Za-z]', '', 'g'))) where imei_2 is not null;
create unique index device_units_serial_unique on public.device_units (lower(trim(serial_number))) where serial_number is not null;
create index device_units_stock_idx on public.device_units (category, device_state, status, created_at desc);
create index device_units_model_stock_idx on public.device_units (product_model_id, status);
create index device_units_public_idx on public.device_units (category, device_state) where status = 'in_stock' and is_publicly_visible;

create or replace function public.validate_device_unit()
returns trigger language plpgsql as $$
declare
  model_category public.product_category;
  model_phone_platform public.phone_platform;
  model_computer_type public.computer_type;
begin
  select category, phone_platform, computer_type into model_category, model_phone_platform, model_computer_type from public.product_models where id = new.product_model_id;
  if not found or model_category <> new.category then raise exception 'Device category must match its product model'; end if;
  if new.category = 'phone' then
    if new.cpu_processor is not null or new.gpu_graphics is not null or new.screen_size_inches is not null or new.battery_cycle_count is not null then raise exception 'Computer-only fields are not allowed for phones'; end if;
    if model_phone_platform = 'iphone' and new.ram_gb is not null then raise exception 'RAM must not be stored for iPhone devices'; end if;
    if model_phone_platform <> 'iphone' and (new.battery_health_percent is not null or new.important_message_type is not null) then raise exception 'Battery health and important message are iPhone-only phone fields'; end if;
    if (new.device_state <> 'used' or model_phone_platform <> 'iphone') and (new.battery_health_percent is not null or new.important_message_type is not null) then raise exception 'Battery health and important message apply only to used iPhones'; end if;
  else
    if new.ram_gb is null then raise exception 'RAM is required for computers'; end if;
    if new.imei_1 is not null or new.imei_2 is not null or new.important_message_type is not null or new.important_message_other is not null then raise exception 'Phone-only fields are not allowed for computers'; end if;
    if model_computer_type in ('macbook', 'windows_laptop') then null; else
      if new.battery_health_percent is not null or new.battery_cycle_count is not null then raise exception 'Battery fields are only applicable to laptop computer types'; end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger device_units_validate before insert or update on public.device_units for each row execute function public.validate_device_unit();
create trigger device_units_set_updated_at before update on public.device_units for each row execute function public.set_updated_at();

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  purchase_number text not null unique,
  purchase_date timestamptz not null default timezone('utc', now()),
  category public.product_category not null,
  device_state public.device_state not null,
  seller_contact_id uuid not null references public.contacts(id) on delete restrict,
  checked_by_user_id uuid not null references public.profiles(id) on delete restrict,
  purchased_by_user_id uuid not null references public.profiles(id) on delete restrict,
  status public.financial_status not null default 'completed',
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);
create index purchases_filters_idx on public.purchases (category, device_state, purchase_date desc);
create index purchases_seller_idx on public.purchases (seller_contact_id, purchase_date desc);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete restrict,
  device_unit_id uuid not null unique references public.device_units(id) on delete restrict,
  purchase_price_mmk bigint not null check (purchase_price_mmk >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);
create index purchase_items_purchase_idx on public.purchase_items (purchase_id);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  sale_date timestamptz not null default timezone('utc', now()),
  customer_contact_id uuid references public.contacts(id) on delete restrict,
  sold_by_user_id uuid not null references public.profiles(id) on delete restrict,
  status public.financial_status not null default 'completed',
  subtotal_mmk bigint not null check (subtotal_mmk >= 0),
  discount_total_mmk bigint not null default 0 check (discount_total_mmk >= 0),
  net_sale_mmk bigint not null check (net_sale_mmk >= 0),
  payment_amount_mmk bigint not null check (payment_amount_mmk >= 0),
  change_amount_mmk bigint not null default 0 check (change_amount_mmk >= 0),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  check (net_sale_mmk = subtotal_mmk - discount_total_mmk),
  check (payment_amount_mmk - net_sale_mmk = change_amount_mmk)
);
create index sales_date_idx on public.sales (sale_date desc);
create index sales_sold_by_idx on public.sales (sold_by_user_id, sale_date desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  device_unit_id uuid not null unique references public.device_units(id) on delete restrict,
  unit_sale_price_mmk bigint not null check (unit_sale_price_mmk >= 0),
  discount_mmk bigint not null default 0 check (discount_mmk >= 0 and discount_mmk <= unit_sale_price_mmk),
  net_sale_mmk bigint not null check (net_sale_mmk = unit_sale_price_mmk - discount_mmk),
  purchase_cost_snapshot_mmk bigint not null check (purchase_cost_snapshot_mmk >= 0),
  warranty_plan_id uuid references public.warranty_plans(id) on delete set null,
  warranty_duration_days_snapshot integer check (warranty_duration_days_snapshot >= 0),
  warranty_terms_snapshot text,
  created_at timestamptz not null default timezone('utc', now()),
  check ((warranty_plan_id is null and warranty_duration_days_snapshot is null and warranty_terms_snapshot is null) or (warranty_plan_id is not null and warranty_duration_days_snapshot is not null and warranty_terms_snapshot is not null))
);
create index sale_items_sale_idx on public.sale_items (sale_id);

create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null unique references public.sales(id) on delete restrict,
  method public.payment_method_code not null,
  amount_mmk bigint not null check (amount_mmk >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  device_unit_id uuid not null references public.device_units(id) on delete restrict,
  transaction_type public.inventory_transaction_type not null,
  status_before public.inventory_status,
  status_after public.inventory_status not null,
  purchase_id uuid references public.purchases(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete restrict,
  reason text,
  performed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  check ((transaction_type = 'purchase_received' and purchase_id is not null and sale_id is null) or (transaction_type = 'sale_completed' and sale_id is not null and purchase_id is null) or (transaction_type = 'void_purchase' and purchase_id is not null and sale_id is null) or (transaction_type = 'void_sale' and sale_id is not null and purchase_id is null) or (transaction_type = 'correction' and purchase_id is null and sale_id is null))
);
create index inventory_transactions_device_idx on public.inventory_transactions (device_unit_id, created_at desc);

create table public.void_records (
  id uuid primary key default gen_random_uuid(),
  target_type public.void_target_type not null,
  purchase_id uuid unique references public.purchases(id) on delete restrict,
  sale_id uuid unique references public.sales(id) on delete restrict,
  reason text not null check (char_length(trim(reason)) >= 3),
  voided_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  check ((target_type = 'purchase' and purchase_id is not null and sale_id is null) or (target_type = 'sale' and sale_id is not null and purchase_id is null))
);

create table public.device_costs (
  id uuid primary key default gen_random_uuid(),
  device_unit_id uuid not null references public.device_units(id) on delete restrict,
  cost_type text not null check (char_length(trim(cost_type)) between 1 and 100),
  amount_mmk bigint not null check (amount_mmk >= 0),
  notes text,
  incurred_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.device_photos (
  id uuid primary key default gen_random_uuid(),
  device_unit_id uuid not null references public.device_units(id) on delete restrict,
  storage_path text not null unique,
  is_public boolean not null default false,
  sort_order smallint not null default 0 check (sort_order >= 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action public.audit_action not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc);

create table public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete restrict,
  export_type text not null,
  parameters jsonb not null default '{}'::jsonb,
  status public.export_status not null default 'requested',
  storage_path text unique,
  expires_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create trigger export_jobs_set_updated_at before update on public.export_jobs for each row execute function public.set_updated_at();
