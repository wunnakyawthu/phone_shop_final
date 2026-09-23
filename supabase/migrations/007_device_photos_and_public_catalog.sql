-- Device photo storage + purchase-with-photos workflow + public catalog polish.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'device-images',
  'device-images',
  true,
  3145728,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists device_images_staff_insert on storage.objects;
create policy device_images_staff_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'device-images'
  and public.is_active_staff()
);

drop policy if exists device_images_staff_update on storage.objects;
create policy device_images_staff_update
on storage.objects
for update
to authenticated
using (bucket_id = 'device-images' and public.is_active_staff())
with check (bucket_id = 'device-images' and public.is_active_staff());

drop policy if exists device_images_staff_delete on storage.objects;
create policy device_images_staff_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'device-images' and public.is_active_staff());

drop policy if exists device_photos_staff_insert_category on public.device_photos;
create policy device_photos_staff_insert_category
on public.device_photos
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.can_access_device(device_unit_id)
);

drop policy if exists device_photos_staff_update_category on public.device_photos;
create policy device_photos_staff_update_category
on public.device_photos
for update
to authenticated
using (public.can_access_device(device_unit_id))
with check (public.can_access_device(device_unit_id));

drop policy if exists device_photos_staff_delete_category on public.device_photos;
create policy device_photos_staff_delete_category
on public.device_photos
for delete
to authenticated
using (public.can_access_device(device_unit_id));

create or replace function public.create_purchase_with_devices_and_photos(
  p_purchase jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  actor_id uuid := auth.uid();
  purchase_id uuid;
  item jsonb;
  device_id uuid;
  photo_path text;
  photo_index integer;
  photos jsonb;
begin
  if actor_id is null or not public.is_active_staff() then
    raise exception 'Authentication is required';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one device is required';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    photos := coalesce(item -> 'photo_paths', '[]'::jsonb);
    if jsonb_typeof(photos) <> 'array'
       or jsonb_array_length(photos) < 2
       or jsonb_array_length(photos) > 6 then
      raise exception 'Each device requires between 2 and 6 photos';
    end if;
  end loop;

  -- The existing function keeps all financial/device validation and inserts atomic.
  purchase_id := public.create_purchase_with_devices(p_purchase, p_items);

  for item in select value from jsonb_array_elements(p_items)
  loop
    select d.id
      into device_id
    from public.purchase_items pi
    join public.device_units d on d.id = pi.device_unit_id
    where pi.purchase_id = purchase_id
      and regexp_replace(coalesce(d.imei_1, ''), '[^0-9A-Za-z]', '', 'g') =
          regexp_replace(coalesce(item ->> 'imei_1', ''), '[^0-9A-Za-z]', '', 'g')
    limit 1;

    if device_id is null then
      raise exception 'Could not match purchased device for photo attachment';
    end if;

    photo_index := 0;
    for photo_path in select jsonb_array_elements_text(item -> 'photo_paths')
    loop
      insert into public.device_photos (
        device_unit_id,
        storage_path,
        is_public,
        sort_order,
        created_by
      ) values (
        device_id,
        photo_path,
        true,
        photo_index,
        actor_id
      );
      photo_index := photo_index + 1;
    end loop;

    update public.device_units
    set
      is_publicly_visible = true,
      updated_by = actor_id
    where id = device_id
      and status = 'in_stock';
  end loop;

  return purchase_id;
end;
$$;

revoke all on function public.create_purchase_with_devices_and_photos(jsonb, jsonb) from public;
grant execute on function public.create_purchase_with_devices_and_photos(jsonb, jsonb) to authenticated;

-- Category staff may publish/unpublish devices they can access, but publishing
-- requires at least two public photos and in-stock status.
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
  photo_count integer;
begin
  if actor_id is null or not public.can_access_device(p_device_id) then
    raise exception 'You do not have permission to change this device';
  end if;

  if p_is_public then
    select count(*) into photo_count
    from public.device_photos
    where device_unit_id = p_device_id
      and is_public = true;

    if photo_count < 2 then
      raise exception 'At least 2 public photos are required before publishing';
    end if;
  end if;

  update public.device_units
  set
    is_publicly_visible = p_is_public,
    updated_by = actor_id
  where id = p_device_id
    and (not p_is_public or status = 'in_stock');

  if not found then
    raise exception 'Only in-stock devices can be published';
  end if;
end;
$$;

drop function if exists public.get_public_catalog_device(uuid);
drop function if exists public.get_public_catalog_devices(public.product_category, text, public.device_state);

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
  battery_health_percent smallint,
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
      nullif(d.public_title_override, ''),
      concat_ws(
        ' ',
        b.name,
        m.name,
        d.color,
        case when d.category = 'phone' and d.storage_capacity_gb is not null
          then concat(d.storage_capacity_gb, ' GB') else null end
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
    d.battery_health_percent,
    d.sale_price_mmk,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('path', photo.storage_path, 'sort_order', photo.sort_order)
          order by photo.sort_order
        )
        from public.device_photos photo
        where photo.device_unit_id = d.id and photo.is_public = true
      ),
      '[]'::jsonb
    )
  from public.device_units d
  join public.product_models m on m.id = d.product_model_id
  join public.brands b on b.id = m.brand_id
  where d.status = 'in_stock'
    and d.is_publicly_visible = true
    and (p_category is null or d.category = p_category)
    and (p_device_state is null or d.device_state = p_device_state)
    and (
      p_search is null or trim(p_search) = ''
      or concat_ws(' ', b.name, m.name, d.color, d.cpu_processor, d.gpu_graphics, d.storage_capacity_gb::text)
        ilike '%' || trim(p_search) || '%'
    )
  order by d.created_at desc;
$$;

create or replace function public.get_public_catalog_device(p_public_id uuid)
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
  battery_health_percent smallint,
  sale_price_mmk bigint,
  photo_paths jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.get_public_catalog_devices(null, null, null)
  where public_id = p_public_id;
$$;

revoke all on function public.get_public_catalog_devices(public.product_category, text, public.device_state) from public;
revoke all on function public.get_public_catalog_device(uuid) from public;
grant execute on function public.get_public_catalog_devices(public.product_category, text, public.device_state) to anon, authenticated;
grant execute on function public.get_public_catalog_device(uuid) to anon, authenticated;
