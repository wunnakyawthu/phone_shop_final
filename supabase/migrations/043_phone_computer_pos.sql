-- Separate Phone and Computer POS flows backed by one consistent receipt ledger.

alter table public.store_settings
  add column if not exists address text,
  add column if not exists receipt_footer text,
  add column if not exists warranty_terms text not null default 'Warranty applies only under the terms printed on this receipt.';

create table if not exists public.pos_sales (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  category public.product_category not null,
  sale_date timestamptz not null default timezone('utc', now()),
  customer_contact_id uuid references public.contacts(id) on delete restrict,
  customer_name_snapshot text not null default 'Walk-in customer',
  customer_phone_snapshot text,
  subtotal_mmk bigint not null check (subtotal_mmk >= 0),
  discount_total_mmk bigint not null default 0 check (discount_total_mmk >= 0),
  net_total_mmk bigint not null check (net_total_mmk = subtotal_mmk - discount_total_mmk),
  payment_method public.payment_method_code not null,
  notes text,
  sold_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists pos_sales_customer_idx on public.pos_sales (customer_contact_id, sale_date desc);
create index if not exists pos_sales_category_date_idx on public.pos_sales (category, sale_date desc);

create table if not exists public.pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.pos_sales(id) on delete restrict,
  device_unit_id uuid references public.device_units(id) on delete restrict,
  computer_inventory_item_id uuid references public.computer_inventory_items(id) on delete restrict,
  product_name_snapshot text not null,
  serial_snapshot text,
  unit_price_mmk bigint not null check (unit_price_mmk >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 50),
  discount_mmk bigint not null default 0 check (discount_mmk >= 0),
  net_price_mmk bigint not null check (net_price_mmk = unit_price_mmk - discount_mmk),
  warranty_terms_snapshot text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  check ((device_unit_id is not null)::integer + (computer_inventory_item_id is not null)::integer = 1)
);

create unique index if not exists pos_sale_items_phone_unique on public.pos_sale_items (device_unit_id) where device_unit_id is not null;
create unique index if not exists pos_sale_items_computer_unique on public.pos_sale_items (computer_inventory_item_id) where computer_inventory_item_id is not null;

alter table public.pos_sales enable row level security;
alter table public.pos_sale_items enable row level security;

drop policy if exists pos_sales_staff_read on public.pos_sales;
create policy pos_sales_staff_read on public.pos_sales for select to authenticated using (public.is_active_staff());
drop policy if exists pos_sale_items_staff_read on public.pos_sale_items;
create policy pos_sale_items_staff_read on public.pos_sale_items for select to authenticated using (public.is_active_staff());

create or replace function public.create_pos_sale(p_category public.product_category, p_sale jsonb, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  new_sale_id uuid := gen_random_uuid();
  customer_id uuid;
  customer_name text := nullif(trim(p_sale->>'customer_name'), '');
  customer_phone text := nullif(trim(p_sale->>'customer_phone'), '');
  warranty_terms text := coalesce(p_sale->>'warranty_terms', '');
  item jsonb;
  row_data record;
  price bigint;
  discount_percent numeric(5,2);
  discount_amount bigint;
  subtotal bigint := 0;
  discount_total bigint := 0;
  invoice text;
begin
  if not public.is_active_staff() then raise exception 'Inactive users cannot create sales'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Add at least one item'; end if;
  if customer_name is null and customer_phone is not null then customer_name := 'Customer'; end if;
  if customer_phone is not null then
    select id into customer_id from public.contacts where phone_number = customer_phone and is_active order by created_at limit 1;
    if customer_id is null then
      insert into public.contacts(full_name, phone_number, contact_type, created_by, updated_by)
      values(customer_name, customer_phone, 'customer', actor, actor) returning id into customer_id;
    else
      update public.contacts set full_name = customer_name, contact_type = case when contact_type = 'supplier' then 'both'::public.contact_type else contact_type end, updated_by = actor where id = customer_id;
    end if;
  end if;

  for item in select value from jsonb_array_elements(p_items) loop
    price := (item->>'unit_price_mmk')::bigint;
    discount_percent := coalesce((item->>'discount_percent')::numeric, 0);
    if price < 0 or discount_percent < 0 or discount_percent > 50 then raise exception 'Invalid price or discount'; end if;
    discount_amount := round(price * discount_percent / 100.0);

    if p_category = 'phone' then
      select d.id, d.status, (b.name || ' ' || m.name) product_name, d.imei_1 serial
      into row_data from public.device_units d join public.product_models m on m.id=d.product_model_id join public.brands b on b.id=m.brand_id
      where d.id=(item->>'inventory_id')::uuid and d.category='phone' for update;
    else
      select c.id, c.status, (coalesce(c.brand,'') || ' ' || coalesce(c.model_name,'')) product_name, c.serial_number serial
      into row_data from public.computer_inventory_items c where c.id=(item->>'inventory_id')::uuid for update;
    end if;
    if not found or row_data.status::text <> 'in_stock' then raise exception 'Selected item is no longer available'; end if;
    subtotal := subtotal + price;
    discount_total := discount_total + discount_amount;
  end loop;

  invoice := (case when p_category='phone' then 'PH' else 'PC' end) || '-' || to_char(timezone('utc',now()),'YYYYMMDD') || '-' || upper(left(replace(new_sale_id::text,'-',''),6));
  insert into public.pos_sales(id,invoice_number,category,customer_contact_id,customer_name_snapshot,customer_phone_snapshot,subtotal_mmk,discount_total_mmk,net_total_mmk,payment_method,notes,sold_by)
  values(new_sale_id,invoice,p_category,customer_id,coalesce(customer_name,'Walk-in customer'),customer_phone,subtotal,discount_total,subtotal-discount_total,(p_sale->>'payment_method')::public.payment_method_code,nullif(trim(p_sale->>'notes'),''),actor);

  for item in select value from jsonb_array_elements(p_items) loop
    price := (item->>'unit_price_mmk')::bigint;
    discount_percent := coalesce((item->>'discount_percent')::numeric,0);
    discount_amount := round(price * discount_percent / 100.0);
    if p_category='phone' then
      select d.id,(b.name || ' ' || m.name) product_name,d.imei_1 serial into row_data from public.device_units d join public.product_models m on m.id=d.product_model_id join public.brands b on b.id=m.brand_id where d.id=(item->>'inventory_id')::uuid;
      insert into public.pos_sale_items(sale_id,device_unit_id,product_name_snapshot,serial_snapshot,unit_price_mmk,discount_percent,discount_mmk,net_price_mmk,warranty_terms_snapshot)
      values(new_sale_id,row_data.id,row_data.product_name,row_data.serial,price,discount_percent,discount_amount,price-discount_amount,warranty_terms);
      update public.device_units set status='sold',is_publicly_visible=false,updated_by=actor where id=row_data.id;
    else
      select c.id,(coalesce(c.brand,'') || ' ' || coalesce(c.model_name,'')) product_name,c.serial_number serial into row_data from public.computer_inventory_items c where c.id=(item->>'inventory_id')::uuid;
      insert into public.pos_sale_items(sale_id,computer_inventory_item_id,product_name_snapshot,serial_snapshot,unit_price_mmk,discount_percent,discount_mmk,net_price_mmk,warranty_terms_snapshot)
      values(new_sale_id,row_data.id,row_data.product_name,row_data.serial,price,discount_percent,discount_amount,price-discount_amount,warranty_terms);
      update public.computer_inventory_items set status='sold',is_publicly_visible=false where id=row_data.id;
    end if;
  end loop;
  return new_sale_id;
end;
$$;

grant execute on function public.create_pos_sale(public.product_category,jsonb,jsonb) to authenticated;
