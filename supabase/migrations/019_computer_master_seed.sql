-- Computer Brand & Model Master Seed

-- =========================
-- COMPUTER BRANDS
-- =========================

insert into public.computer_brands (name)
values
  ('Apple'),
  ('Dell'),
  ('HP'),
  ('Lenovo'),
  ('Asus'),
  ('Acer'),
  ('MSI'),
  ('Microsoft'),
  ('Razer'),
  ('Gigabyte'),
  ('Samsung'),
  ('Huawei')
on conflict (name) do nothing;


-- =========================
-- COMPUTER MODELS
-- =========================

-- Apple
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('MacBook Air M1'),
    ('MacBook Air M2'),
    ('MacBook Air M3'),
    ('MacBook Pro 14 M3'),
    ('MacBook Pro 16 M3'),
    ('iMac 24-inch'),
    ('Mac mini M4')
) as models(model_name)
where computer_brands.name = 'Apple'
on conflict (brand_id, name) do nothing;


-- Dell
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('Inspiron 15'),
    ('XPS 13'),
    ('XPS 15'),
    ('Latitude 5420'),
    ('Precision Series'),
    ('Alienware')
) as models(model_name)
where computer_brands.name = 'Dell'
on conflict (brand_id, name) do nothing;


-- HP
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('Pavilion'),
    ('Envy'),
    ('Spectre'),
    ('EliteBook'),
    ('ProBook'),
    ('Omen')
) as models(model_name)
where computer_brands.name = 'HP'
on conflict (brand_id, name) do nothing;


-- Lenovo
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('ThinkPad'),
    ('IdeaPad'),
    ('Yoga'),
    ('Legion'),
    ('ThinkCentre')
) as models(model_name)
where computer_brands.name = 'Lenovo'
on conflict (brand_id, name) do nothing;


-- Asus
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('ROG'),
    ('TUF Gaming'),
    ('VivoBook'),
    ('ZenBook'),
    ('ExpertBook')
) as models(model_name)
where computer_brands.name = 'Asus'
on conflict (brand_id, name) do nothing;


-- Acer
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('Aspire'),
    ('Swift'),
    ('Predator'),
    ('Nitro'),
    ('TravelMate')
) as models(model_name)
where computer_brands.name = 'Acer'
on conflict (brand_id, name) do nothing;


-- MSI
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('Modern'),
    ('Prestige'),
    ('Stealth'),
    ('Raider'),
    ('Titan')
) as models(model_name)
where computer_brands.name = 'MSI'
on conflict (brand_id, name) do nothing;


-- Microsoft
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('Surface Laptop'),
    ('Surface Pro'),
    ('Surface Studio')
) as models(model_name)
where computer_brands.name = 'Microsoft'
on conflict (brand_id, name) do nothing;


-- Razer
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('Blade 14'),
    ('Blade 15'),
    ('Blade 16')
) as models(model_name)
where computer_brands.name = 'Razer'
on conflict (brand_id, name) do nothing;


-- Gigabyte
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('Aero'),
    ('Aorus')
) as models(model_name)
where computer_brands.name = 'Gigabyte'
on conflict (brand_id, name) do nothing;


-- Samsung
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('Galaxy Book'),
    ('Galaxy Book Pro'),
    ('Galaxy Book Ultra')
) as models(model_name)
where computer_brands.name = 'Samsung'
on conflict (brand_id, name) do nothing;


-- Huawei
insert into public.computer_models (brand_id, name)
select id, model_name
from public.computer_brands,
(
  values
    ('MateBook D'),
    ('MateBook X Pro'),
    ('MateBook 14')
) as models(model_name)
where computer_brands.name = 'Huawei'
on conflict (brand_id, name) do nothing;