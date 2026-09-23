-- Computer inventory foundation

create table if not exists public.computer_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);


create table if not exists public.computer_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.computer_brands(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),

  unique(brand_id, name)
);


do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'computer_type'
  ) then
    create type public.computer_type as enum (
      'laptop',
      'desktop',
      'all_in_one',
      'mini_pc',
      'workstation',
      'gaming_pc'
    );
  end if;
end $$;


do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'computer_condition'
  ) then
    create type public.computer_condition as enum (
      'new',
      'used'
    );
  end if;
end $$;


create table if not exists public.computer_inventory_items (
  id uuid primary key default gen_random_uuid(),

  computer_type public.computer_type not null,

  brand_id uuid references public.computer_brands(id),
  model_id uuid references public.computer_models(id),

  model_name text,

  cpu text,
  ram text,
  storage text,
  gpu text,
  screen_size text,

  serial_number text unique,

  color text,

  condition public.computer_condition not null default 'used',

  purchase_from text,
  purchase_date date,

  purchase_price numeric not null default 0,
  sale_price numeric not null default 0,

  status text not null default 'in_stock',

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);


create table if not exists public.computer_photos (
  id uuid primary key default gen_random_uuid(),

  computer_id uuid not null
    references public.computer_inventory_items(id)
    on delete cascade,

  storage_path text not null,

  sort_order integer not null default 0,

  created_at timestamptz not null default timezone('utc', now())
);