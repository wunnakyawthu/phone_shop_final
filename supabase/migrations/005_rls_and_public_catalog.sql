-- Phase 2 RLS, grants, and public catalog access.
--
-- RLS is the authorization boundary.
-- The browser receives no service-role or privileged credentials.
--
-- Staff access is restricted by role and product category.
-- Owner-only data is protected by both grants and RLS.
-- Public catalog access uses fixed-shape SECURITY DEFINER functions
-- and never exposes internal purchase, profit, staff, IMEI/serial,
-- seller/customer, audit, or internal inventory information.

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.store_settings enable row level security;
alter table public.brands enable row level security;
alter table public.product_models enable row level security;
alter table public.payment_methods enable row level security;
alter table public.warranty_plans enable row level security;
alter table public.contacts enable row level security;
alter table public.device_units enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.void_records enable row level security;
alter table public.device_costs enable row level security;
alter table public.device_photos enable row level security;
alter table public.audit_logs enable row level security;
alter table public.export_jobs enable row level security;


-- ============================================================
-- PROFILE / USER ROLE POLICIES
-- ============================================================

create policy profiles_owner_all
on public.profiles
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy profiles_self_read
on public.profiles
for select
to authenticated
using (id = auth.uid());


create policy roles_owner_all
on public.user_roles
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy roles_self_read
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());


-- ============================================================
-- STORE SETTINGS
-- ============================================================

create policy settings_owner_all
on public.store_settings
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


-- ============================================================
-- BRANDS / PRODUCT MODELS
-- ============================================================

create policy brands_owner_all
on public.brands
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy brands_staff_read
on public.brands
for select
to authenticated
using (public.is_active_staff());


create policy models_owner_all
on public.product_models
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy models_staff_read
on public.product_models
for select
to authenticated
using (public.is_active_staff());


-- ============================================================
-- PAYMENT METHODS
-- ============================================================

create policy payment_methods_owner_all
on public.payment_methods
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy payment_methods_staff_read
on public.payment_methods
for select
to authenticated
using (
  public.is_active_staff()
  and is_enabled
);


-- ============================================================
-- WARRANTY PLANS
-- ============================================================

create policy warranties_owner_all
on public.warranty_plans
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy warranties_staff_read
on public.warranty_plans
for select
to authenticated
using (
  public.is_active_staff()
  and is_active
);


-- ============================================================
-- CONTACTS
-- ============================================================

create policy contacts_owner_all
on public.contacts
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy contacts_staff_read
on public.contacts
for select
to authenticated
using (public.is_active_staff());


create policy contacts_staff_insert
on public.contacts
for insert
to authenticated
with check (
  public.is_active_staff()
  and created_by = auth.uid()
);


create policy contacts_staff_update_own
on public.contacts
for update
to authenticated
using (
  public.is_active_staff()
  and created_by = auth.uid()
)
with check (
  public.is_active_staff()
  and created_by = auth.uid()
);


-- ============================================================
-- DEVICE UNITS
-- ============================================================

create policy devices_owner_all
on public.device_units
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy devices_staff_read_category
on public.device_units
for select
to authenticated
using (
  public.can_access_category(category)
);


-- ============================================================
-- PURCHASES
-- ============================================================

create policy purchases_owner_all
on public.purchases
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy purchases_staff_read_category
on public.purchases
for select
to authenticated
using (
  public.can_access_category(category)
);


create policy purchase_items_owner_all
on public.purchase_items
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy purchase_items_staff_read_category
on public.purchase_items
for select
to authenticated
using (
  public.can_access_device(device_unit_id)
);


-- ============================================================
-- SALES
-- ============================================================

create policy sales_owner_all
on public.sales
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy sales_staff_read_scoped
on public.sales
for select
to authenticated
using (
  public.can_access_sale(id)
);


create policy sale_items_owner_all
on public.sale_items
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy sale_payments_owner_all
on public.sale_payments
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy sale_payments_staff_read_scoped
on public.sale_payments
for select
to authenticated
using (
  public.can_access_sale(sale_id)
);


-- ============================================================
-- INVENTORY TRANSACTIONS
-- ============================================================

create policy inventory_transactions_owner_all
on public.inventory_transactions
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy inventory_transactions_staff_read_category
on public.inventory_transactions
for select
to authenticated
using (
  public.can_access_device(device_unit_id)
);


-- ============================================================
-- VOID RECORDS
-- ============================================================

create policy void_records_owner_all
on public.void_records
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


-- ============================================================
-- DEVICE COSTS
-- ============================================================

create policy device_costs_owner_all
on public.device_costs
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


-- ============================================================
-- DEVICE PHOTOS
-- ============================================================

create policy device_photos_owner_all
on public.device_photos
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


create policy device_photos_staff_read_category
on public.device_photos
for select
to authenticated
using (
  public.can_access_device(device_unit_id)
);


-- ============================================================
-- AUDIT LOGS
-- ============================================================

create policy audit_logs_owner_read
on public.audit_logs
for select
to authenticated
using (public.is_owner());


-- ============================================================
-- EXPORT JOBS
-- ============================================================

create policy export_jobs_owner_all
on public.export_jobs
for all
to authenticated
using (public.is_owner())
with check (public.is_owner());


-- ============================================================
-- REMOVE DEFAULT TABLE PRIVILEGES
-- ============================================================

revoke all
on all tables in schema public
from anon, authenticated;


-- ============================================================
-- SCHEMA USAGE
-- ============================================================

grant usage
on schema public
to anon, authenticated;


-- ============================================================
-- MINIMAL TABLE PRIVILEGES
-- RLS remains the authorization boundary.
-- ============================================================

grant select, update
on public.profiles
to authenticated;


grant select, insert, update
on public.user_roles
to authenticated;


grant select, insert, update
on public.store_settings
to authenticated;


grant select, insert, update
on public.brands
to authenticated;


grant select, insert, update
on public.product_models
to authenticated;


grant select, insert, update
on public.payment_methods
to authenticated;


grant select, insert, update
on public.warranty_plans
to authenticated;


grant select, insert, update
on public.contacts
to authenticated;


grant select
on public.device_units
to authenticated;


grant select
on public.purchases
to authenticated;


grant select
on public.purchase_items
to authenticated;


grant select
on public.sales
to authenticated;


grant select
on public.sale_items
to authenticated;


grant select
on public.sale_payments
to authenticated;


grant select
on public.inventory_transactions
to authenticated;


grant select
on public.void_records
to authenticated;


grant select, insert
on public.device_costs
to authenticated;


grant select, insert, update
on public.device_photos
to authenticated;


grant select
on public.audit_logs
to authenticated;


grant select, insert, update
on public.export_jobs
to authenticated;


-- ============================================================
-- REMOVE FUNCTION EXECUTION FROM PUBLIC
-- ============================================================

revoke all
on all functions in schema public
from public;


-- ============================================================
-- AUTHENTICATED FUNCTION EXECUTION
-- ============================================================

grant execute
on function public.current_app_role()
to authenticated;


grant execute
on function public.is_active_staff()
to authenticated;


grant execute
on function public.is_owner()
to authenticated;


grant execute
on function public.profile_can_access_category(
  uuid,
  public.product_category
)
to authenticated;


grant execute
on function public.can_access_category(
  public.product_category
)
to authenticated;


grant execute
on function public.can_access_device(
  uuid
)
to authenticated;


grant execute
on function public.can_access_purchase(
  uuid
)
to authenticated;


grant execute
on function public.can_access_sale(
  uuid
)
to authenticated;


-- ============================================================
-- CONTROLLED TRANSACTION RPCs
-- ============================================================

grant execute
on function public.create_purchase_with_devices(
  jsonb,
  jsonb
)
to authenticated;


grant execute
on function public.create_sale_with_items(
  jsonb,
  jsonb
)
to authenticated;


grant execute
on function public.void_sale(
  uuid,
  text
)
to authenticated;


grant execute
on function public.void_purchase(
  uuid,
  text
)
to authenticated;


grant execute
on function public.correct_inventory_status(
  uuid,
  public.inventory_status,
  text
)
to authenticated;


grant execute
on function public.set_device_publication(
  uuid,
  boolean
)
to authenticated;


grant execute
on function public.get_authorized_sale_items(
  uuid
)
to authenticated;


-- ============================================================
-- PUBLIC CATALOG LIST
-- ============================================================
--
-- This function deliberately exposes only a safe fixed shape.
--
-- NEVER returns:
--   purchase price
--   profit
--   staff information
--   IMEI
--   serial number
--   seller/customer
--   internal notes
--   audit data
--   inventory transaction data
--   private photos
--
-- Only:
--   in_stock
--   explicitly published
-- devices are returned.
-- ============================================================

create or replace function public.get_public_catalog_devices(
  p_category public.product_category default null,
  p_search text default null,
  p_device_state public.device_state default null
)
returns table (
  public_id uuid,
  category public.product_category,
  device_state public.device_state,
  brand_name text,
  model_name text,
  public_title text,
  color text,
  ram_gb smallint,
  storage_type text,
  storage_capacity_gb integer,
  cpu_processor text,
  gpu_graphics text,
  screen_size_inches numeric,
  condition public.device_condition,
  sale_price_mmk bigint,
  photo_paths jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.public_token,
    d.category,
    d.device_state,
    b.name,
    m.name,

    coalesce(
      nullif(
        d.public_title_override,
        ''
      ),
      concat_ws(
        ' ',
        b.name,
        m.name,
        d.color,
        case
          when d.category = 'phone'
          then concat(
            d.storage_capacity_gb,
            ' GB'
          )
          else null
        end
      )
    ),

    d.color,
    d.ram_gb,
    d.storage_type,
    d.storage_capacity_gb,
    d.cpu_processor,
    d.gpu_graphics,
    d.screen_size_inches,
    d.condition,
    d.sale_price_mmk,

    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'path',
            photo.storage_path,
            'sort_order',
            photo.sort_order
          )
          order by photo.sort_order
        )
        from public.device_photos photo
        where photo.device_unit_id = d.id
          and photo.is_public = true
      ),
      '[]'::jsonb
    )

  from public.device_units d

  join public.product_models m
    on m.id = d.product_model_id

  join public.brands b
    on b.id = m.brand_id

  where d.status = 'in_stock'
    and d.is_publicly_visible = true

    and (
      p_category is null
      or d.category = p_category
    )

    and (
      p_device_state is null
      or d.device_state = p_device_state
    )

    and (
      p_search is null
      or trim(p_search) = ''
      or concat_ws(
        ' ',
        b.name,
        m.name,
        d.color,
        d.cpu_processor,
        d.gpu_graphics,
        d.storage_capacity_gb::text
      ) ilike '%' || trim(p_search) || '%'
    )

  order by
    b.name,
    m.name,
    d.created_at desc;
$$;


-- ============================================================
-- PUBLIC CATALOG SINGLE DEVICE
-- ============================================================

create or replace function public.get_public_catalog_device(
  p_public_id uuid
)
returns table (
  public_id uuid,
  category public.product_category,
  device_state public.device_state,
  brand_name text,
  model_name text,
  public_title text,
  color text,
  ram_gb smallint,
  storage_type text,
  storage_capacity_gb integer,
  cpu_processor text,
  gpu_graphics text,
  screen_size_inches numeric,
  condition public.device_condition,
  sale_price_mmk bigint,
  photo_paths jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.get_public_catalog_devices(
    null,
    null,
    null
  )
  where public_id = p_public_id;
$$;


-- ============================================================
-- IMPORTANT:
-- These functions are created AFTER the global function revoke
-- above, so explicitly remove PUBLIC execution again.
-- ============================================================

revoke all
on function public.get_public_catalog_devices(
  public.product_category,
  text,
  public.device_state
)
from public;


revoke all
on function public.get_public_catalog_device(
  uuid
)
from public;


-- ============================================================
-- PUBLIC CATALOG EXECUTION
-- ============================================================

grant execute
on function public.get_public_catalog_devices(
  public.product_category,
  text,
  public.device_state
)
to anon, authenticated;


grant execute
on function public.get_public_catalog_device(
  uuid
)
to anon, authenticated;