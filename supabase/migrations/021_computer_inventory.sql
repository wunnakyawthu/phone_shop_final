
create table if not exists public.computer_inventory_items (
  id uuid primary key default gen_random_uuid(),

  computer_type text not null,
  brand text,
  model_name text not null,

  cpu text,
  ram text,

  primary_storage_type text,
  primary_storage_size text,

  secondary_storage_type text,
  secondary_storage_size text,

  gpu text,
  screen_size text,
  color text,

  serial_number text,

  condition text,

  purchase_from text,
  purchase_date date,

  purchase_price numeric default 0,
  sale_price numeric default 0,

  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);


create index if not exists computer_inventory_items_model_idx
on public.computer_inventory_items(model_name);


create index if not exists computer_inventory_items_serial_idx
on public.computer_inventory_items(serial_number);