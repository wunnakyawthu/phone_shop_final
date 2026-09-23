create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  full_name text not null check (char_length(trim(full_name)) between 1 and 160),
  phone text,
  email text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  role public.app_role not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default timezone('utc', now())
);

create table public.store_settings (
  id boolean primary key default true check (id),
  store_name text not null default 'Retail Hub',
  phone text,
  facebook_url text,
  viber_url text,
  tiktok_url text,
  discount_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles(id) on delete set null
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  category public.product_category,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique nulls not distinct (name, category)
);

create table public.product_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  category public.product_category not null,
  name text not null check (char_length(trim(name)) between 1 and 140),
  phone_platform public.phone_platform,
  computer_type public.computer_type,
  public_description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check ((category = 'phone' and phone_platform is not null and computer_type is null) or (category = 'computer' and computer_type is not null and phone_platform is null)),
  unique nulls not distinct (brand_id, category, name, phone_platform, computer_type)
);

create or replace function public.validate_product_model_brand_category()
returns trigger language plpgsql as $$
declare brand_category public.product_category;
begin
  select category into brand_category from public.brands where id = new.brand_id;
  if not found then raise exception 'Brand not found'; end if;
  if brand_category is not null and brand_category <> new.category then
    raise exception 'Product model category must match the brand category';
  end if;
  return new;
end;
$$;
create trigger product_models_validate_brand_category before insert or update on public.product_models for each row execute function public.validate_product_model_brand_category();

create table public.payment_methods (
  code public.payment_method_code primary key,
  display_name text not null,
  is_enabled boolean not null default true,
  sort_order smallint not null unique check (sort_order > 0)
);

insert into public.payment_methods (code, display_name, sort_order) values
  ('cash', 'Cash', 1),
  ('kbz_pay', 'KBZ Pay', 2),
  ('aya_pay', 'AYA Pay', 3),
  ('wave_pay', 'Wave Pay', 4),
  ('bank_transfer', 'Bank Transfer', 5);

create table public.warranty_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  duration_days integer not null check (duration_days >= 0),
  customer_terms text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  unique (name)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 1 and 160),
  phone_number text not null check (char_length(trim(phone_number)) between 1 and 40),
  contact_type public.contact_type not null,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger store_settings_set_updated_at before update on public.store_settings for each row execute function public.set_updated_at();
create trigger brands_set_updated_at before update on public.brands for each row execute function public.set_updated_at();
create trigger product_models_set_updated_at before update on public.product_models for each row execute function public.set_updated_at();
create trigger warranty_plans_set_updated_at before update on public.warranty_plans for each row execute function public.set_updated_at();
create trigger contacts_set_updated_at before update on public.contacts for each row execute function public.set_updated_at();

create index profiles_active_idx on public.profiles (is_active) where is_active;
create index contacts_phone_idx on public.contacts (phone_number);
create index contacts_name_trgm_idx on public.contacts using gin (full_name gin_trgm_ops);
create index product_models_brand_category_idx on public.product_models (brand_id, category) where is_active;
