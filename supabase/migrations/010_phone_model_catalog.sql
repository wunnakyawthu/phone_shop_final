-- Phone model catalog for fast, accurate purchase entry.
-- Stores model-specific color/storage options and expected IMEI count.

create table if not exists public.phone_model_specs (
  product_model_id uuid primary key references public.product_models(id) on delete cascade,
  colors text[] not null default '{}',
  storage_options_gb integer[] not null default '{}',
  imei_count smallint not null default 2 check (imei_count between 1 and 2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (array_length(storage_options_gb, 1) is null or 0 < all(storage_options_gb))
);

alter table public.phone_model_specs enable row level security;

drop policy if exists phone_model_specs_staff_select on public.phone_model_specs;
create policy phone_model_specs_staff_select
on public.phone_model_specs
for select
to authenticated
using (public.is_active_staff());

create or replace function public.upsert_phone_model_with_specs(
  p_brand_id uuid,
  p_name text,
  p_phone_platform public.phone_platform,
  p_colors text[],
  p_storage_options_gb integer[],
  p_imei_count smallint default 2
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_model_id uuid;
  v_name text := nullif(trim(p_name), '');
  v_colors text[];
  v_storage integer[];
begin
  if v_actor is null or not public.profile_can_access_category(v_actor, 'phone') then
    raise exception 'You do not have permission to manage phone models';
  end if;

  if v_name is null then
    raise exception 'Model name is required';
  end if;

  if p_imei_count not between 1 and 2 then
    raise exception 'IMEI count must be 1 or 2';
  end if;

  select array_agg(distinct trim(value) order by trim(value))
    into v_colors
  from unnest(coalesce(p_colors, '{}'::text[])) as value
  where nullif(trim(value), '') is not null;

  select array_agg(distinct value order by value)
    into v_storage
  from unnest(coalesce(p_storage_options_gb, '{}'::integer[])) as value
  where value > 0;

  if coalesce(array_length(v_colors, 1), 0) = 0 then
    raise exception 'Add at least one color';
  end if;
  if coalesce(array_length(v_storage, 1), 0) = 0 then
    raise exception 'Add at least one storage option';
  end if;

  select pm.id
    into v_model_id
  from public.product_models pm
  where pm.brand_id = p_brand_id
    and pm.category = 'phone'
    and lower(pm.name) = lower(v_name)
  limit 1;

  if v_model_id is null then
    insert into public.product_models (
      brand_id, category, name, phone_platform, is_active, created_by, updated_by
    ) values (
      p_brand_id, 'phone', v_name, p_phone_platform, true, v_actor, v_actor
    ) returning id into v_model_id;
  else
    update public.product_models
      set phone_platform = p_phone_platform,
          is_active = true,
          updated_by = v_actor,
          updated_at = timezone('utc', now())
    where id = v_model_id;
  end if;

  insert into public.phone_model_specs (
    product_model_id, colors, storage_options_gb, imei_count
  ) values (
    v_model_id, v_colors, v_storage, p_imei_count
  )
  on conflict (product_model_id) do update
    set colors = excluded.colors,
        storage_options_gb = excluded.storage_options_gb,
        imei_count = excluded.imei_count,
        updated_at = timezone('utc', now());

  return v_model_id;
end;
$$;

grant execute on function public.upsert_phone_model_with_specs(uuid, text, public.phone_platform, text[], integer[], smallint) to authenticated;

-- Seed / refresh Apple's released iPhone catalog. These rows are editable through
-- the same model-spec workflow, so the shop can add region-specific options later.
do $$
declare
  v_brand_id uuid;
  r record;
  v_model_id uuid;
begin
  select id into v_brand_id
  from public.brands
  where lower(name) = 'apple' and (category = 'phone' or category is null)
  order by case when category = 'phone' then 0 else 1 end
  limit 1;

  if v_brand_id is null then
    insert into public.brands (name, category, is_active)
    values ('Apple', 'phone', true)
    returning id into v_brand_id;
  end if;

  for r in
    select * from (values
      ('iPhone',               array['Black']::text[],                                           array[4,8,16]::integer[], 1),
      ('iPhone 3G',            array['Black','White'],                                            array[8,16], 1),
      ('iPhone 3GS',           array['Black','White'],                                            array[8,16,32], 1),
      ('iPhone 4',             array['Black','White'],                                            array[8,16,32], 1),
      ('iPhone 4s',            array['Black','White'],                                            array[8,16,32,64], 1),
      ('iPhone 5',             array['Black & Slate','White & Silver'],                            array[16,32,64], 1),
      ('iPhone 5c',            array['White','Pink','Yellow','Blue','Green'],                      array[8,16,32], 1),
      ('iPhone 5s',            array['Space Gray','Silver','Gold'],                               array[16,32,64], 1),
      ('iPhone 6',             array['Space Gray','Silver','Gold'],                               array[16,32,64,128], 1),
      ('iPhone 6 Plus',        array['Space Gray','Silver','Gold'],                               array[16,64,128], 1),
      ('iPhone 6s',            array['Space Gray','Silver','Gold','Rose Gold'],                   array[16,32,64,128], 1),
      ('iPhone 6s Plus',       array['Space Gray','Silver','Gold','Rose Gold'],                   array[16,32,64,128], 1),
      ('iPhone SE (1st gen)',  array['Space Gray','Silver','Gold','Rose Gold'],                   array[16,32,64,128], 1),
      ('iPhone 7',             array['Jet Black','Black','Silver','Gold','Rose Gold','Red'],       array[32,128,256], 1),
      ('iPhone 7 Plus',        array['Jet Black','Black','Silver','Gold','Rose Gold','Red'],       array[32,128,256], 1),
      ('iPhone 8',             array['Space Gray','Silver','Gold','Red'],                         array[64,128,256], 1),
      ('iPhone 8 Plus',        array['Space Gray','Silver','Gold','Red'],                         array[64,128,256], 1),
      ('iPhone X',             array['Space Gray','Silver'],                                      array[64,256], 1),
      ('iPhone XS',            array['Space Gray','Silver','Gold'],                               array[64,256,512], 2),
      ('iPhone XS Max',        array['Space Gray','Silver','Gold'],                               array[64,256,512], 2),
      ('iPhone XR',            array['Black','White','Blue','Yellow','Coral','Red'],               array[64,128,256], 2),
      ('iPhone 11',            array['Purple','Yellow','Green','Black','White','Red'],             array[64,128,256], 2),
      ('iPhone 11 Pro',        array['Midnight Green','Space Gray','Silver','Gold'],               array[64,256,512], 2),
      ('iPhone 11 Pro Max',    array['Midnight Green','Space Gray','Silver','Gold'],               array[64,256,512], 2),
      ('iPhone SE (2nd gen)',  array['Black','White','Red'],                                      array[64,128,256], 2),
      ('iPhone 12 mini',       array['Black','White','Red','Green','Blue','Purple'],               array[64,128,256], 2),
      ('iPhone 12',            array['Black','White','Red','Green','Blue','Purple'],               array[64,128,256], 2),
      ('iPhone 12 Pro',        array['Graphite','Silver','Gold','Pacific Blue'],                   array[128,256,512], 2),
      ('iPhone 12 Pro Max',    array['Graphite','Silver','Gold','Pacific Blue'],                   array[128,256,512], 2),
      ('iPhone 13 mini',       array['Pink','Blue','Midnight','Starlight','Red','Green'],          array[128,256,512], 2),
      ('iPhone 13',            array['Pink','Blue','Midnight','Starlight','Red','Green'],          array[128,256,512], 2),
      ('iPhone 13 Pro',        array['Graphite','Gold','Silver','Sierra Blue','Alpine Green'],     array[128,256,512,1024], 2),
      ('iPhone 13 Pro Max',    array['Graphite','Gold','Silver','Sierra Blue','Alpine Green'],     array[128,256,512,1024], 2),
      ('iPhone SE (3rd gen)',  array['Midnight','Starlight','Red'],                               array[64,128,256], 2),
      ('iPhone 14',            array['Midnight','Purple','Starlight','Red','Blue','Yellow'],       array[128,256,512], 2),
      ('iPhone 14 Plus',       array['Midnight','Purple','Starlight','Red','Blue','Yellow'],       array[128,256,512], 2),
      ('iPhone 14 Pro',        array['Space Black','Silver','Gold','Deep Purple'],                 array[128,256,512,1024], 2),
      ('iPhone 14 Pro Max',    array['Space Black','Silver','Gold','Deep Purple'],                 array[128,256,512,1024], 2),
      ('iPhone 15',            array['Black','Blue','Green','Yellow','Pink'],                      array[128,256,512], 2),
      ('iPhone 15 Plus',       array['Black','Blue','Green','Yellow','Pink'],                      array[128,256,512], 2),
      ('iPhone 15 Pro',        array['Black Titanium','White Titanium','Blue Titanium','Natural Titanium'], array[128,256,512,1024], 2),
      ('iPhone 15 Pro Max',    array['Black Titanium','White Titanium','Blue Titanium','Natural Titanium'], array[256,512,1024], 2),
      ('iPhone 16',            array['Black','White','Pink','Teal','Ultramarine'],                 array[128,256,512], 2),
      ('iPhone 16 Plus',       array['Black','White','Pink','Teal','Ultramarine'],                 array[128,256,512], 2),
      ('iPhone 16 Pro',        array['Black Titanium','White Titanium','Natural Titanium','Desert Titanium'], array[128,256,512,1024], 2),
      ('iPhone 16 Pro Max',    array['Black Titanium','White Titanium','Natural Titanium','Desert Titanium'], array[256,512,1024], 2),
      ('iPhone 16e',           array['Black','White'],                                            array[128,256,512], 2),
      ('iPhone 17',            array['Black','White','Mist Blue','Sage','Lavender'],               array[256,512], 2),
      ('iPhone Air',           array['Space Black','Cloud White','Light Gold','Sky Blue'],         array[256,512,1024], 2),
      ('iPhone 17 Pro',        array['Silver','Deep Blue','Cosmic Orange'],                        array[256,512,1024], 2),
      ('iPhone 17 Pro Max',    array['Silver','Deep Blue','Cosmic Orange'],                        array[256,512,1024,2048], 2),
      ('iPhone 17e',           array['Black','White','Soft Pink'],                                array[256,512], 2),
      ('iPhone 18 Pro',        array['Black','Silver','Glacier','Burgundy'],                       array[256,512,1024,2048], 2),
      ('iPhone 18 Pro Max',    array['Black','Silver','Glacier','Burgundy'],                       array[256,512,1024,2048], 2),
      ('iPhone Duo',           array['Night Sky','Star White'],                                   array[256,512,1024,2048], 2)
    ) as x(name, colors, storage_options_gb, imei_count)
  loop
    select id into v_model_id
    from public.product_models
    where brand_id = v_brand_id
      and category = 'phone'
      and lower(name) = lower(r.name)
    limit 1;

    if v_model_id is null then
      insert into public.product_models (brand_id, category, name, phone_platform, is_active)
      values (v_brand_id, 'phone', r.name, 'iphone', true)
      returning id into v_model_id;
    else
      update public.product_models
      set phone_platform = 'iphone', is_active = true, updated_at = timezone('utc', now())
      where id = v_model_id;
    end if;

    insert into public.phone_model_specs (product_model_id, colors, storage_options_gb, imei_count)
    values (v_model_id, r.colors, r.storage_options_gb, r.imei_count)
    on conflict (product_model_id) do update
      set colors = excluded.colors,
          storage_options_gb = excluded.storage_options_gb,
          imei_count = excluded.imei_count,
          updated_at = timezone('utc', now());
  end loop;

  -- Known existing Samsung S24 option set, if that model already exists.
  for v_model_id in
    select pm.id
    from public.product_models pm
    join public.brands b on b.id = pm.brand_id
    where lower(b.name) = 'samsung' and lower(pm.name) = 'galaxy s24' and pm.category = 'phone'
  loop
    insert into public.phone_model_specs (product_model_id, colors, storage_options_gb, imei_count)
    values (
      v_model_id,
      array['Onyx Black','Marble Gray','Cobalt Violet','Amber Yellow'],
      array[128,256],
      2
    )
    on conflict (product_model_id) do update
      set colors = excluded.colors,
          storage_options_gb = excluded.storage_options_gb,
          imei_count = excluded.imei_count,
          updated_at = timezone('utc', now());
  end loop;
end;
$$;
