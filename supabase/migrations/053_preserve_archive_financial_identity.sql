-- Keep a compact, immutable sales ledger after warranty data is archived.
-- Photos and operational device details may be purged, but accounting identity remains.

alter table public.pos_sale_items
  add column if not exists category_snapshot public.product_category,
  add column if not exists purchase_date_snapshot timestamptz,
  add column if not exists warranty_started_at timestamptz,
  add column if not exists profit_snapshot_mmk bigint generated always as
    (net_price_mmk - purchase_cost_snapshot_mmk) stored;

update public.pos_sale_items i
set
  category_snapshot = coalesce(i.category_snapshot, s.category),
  warranty_started_at = coalesce(i.warranty_started_at, s.sale_date),
  purchase_date_snapshot = coalesce(
    i.purchase_date_snapshot,
    (
      select p.purchase_date
      from public.purchase_items pi
      join public.purchases p on p.id = pi.purchase_id
      where pi.device_unit_id = i.device_unit_id
      limit 1
    ),
    (
      select c.purchase_date::timestamp at time zone 'UTC'
      from public.computer_inventory_items c
      where c.id = i.computer_inventory_item_id
      limit 1
    )
  )
from public.pos_sales s
where s.id = i.sale_id;

alter table public.pos_sale_items
  alter column category_snapshot set not null,
  alter column warranty_started_at set not null;

create or replace function public.set_pos_sale_item_archive_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sale_row record;
begin
  select category, sale_date
  into sale_row
  from public.pos_sales
  where id = new.sale_id;

  new.category_snapshot := coalesce(new.category_snapshot, sale_row.category);
  new.warranty_started_at := coalesce(new.warranty_started_at, sale_row.sale_date);

  if new.purchase_date_snapshot is null and new.device_unit_id is not null then
    select p.purchase_date
    into new.purchase_date_snapshot
    from public.purchase_items pi
    join public.purchases p on p.id = pi.purchase_id
    where pi.device_unit_id = new.device_unit_id
    limit 1;
  elsif new.purchase_date_snapshot is null and new.computer_inventory_item_id is not null then
    select c.purchase_date::timestamp at time zone 'UTC'
    into new.purchase_date_snapshot
    from public.computer_inventory_items c
    where c.id = new.computer_inventory_item_id
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists pos_sale_item_archive_snapshots on public.pos_sale_items;
create trigger pos_sale_item_archive_snapshots
before insert on public.pos_sale_items
for each row execute function public.set_pos_sale_item_archive_snapshots();

create or replace function public.purge_archived_device_data(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  photo record;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can purge device data';
  end if;

  select * into item
  from public.pos_sale_items
  where id = p_item_id
    and archived_at is not null
    and warranty_expires_at <= timezone('utc', now())
  for update;

  if not found then
    raise exception 'Archive the expired warranty item before purging';
  end if;
  if item.purged_at is not null then
    raise exception 'Device data was already purged';
  end if;

  if item.device_unit_id is not null then
    for photo in
      select storage_path from public.device_photos
      where device_unit_id = item.device_unit_id
    loop
      delete from storage.objects
      where bucket_id = 'device-images' and name = photo.storage_path;
    end loop;
    delete from public.device_photos where device_unit_id = item.device_unit_id;
    update public.device_units
    set status = 'voided',
        is_publicly_visible = false,
        imei_1 = 'PURGED-' || left(id::text, 12),
        imei_2 = null,
        internal_notes = null,
        important_message_type = null,
        important_message_other = null,
        updated_by = auth.uid()
    where id = item.device_unit_id;
  else
    for photo in
      select storage_path from public.computer_inventory_photos
      where computer_id = item.computer_inventory_item_id
    loop
      delete from storage.objects
      where bucket_id = 'device-images' and name = photo.storage_path;
    end loop;
    delete from public.computer_inventory_photos
    where computer_id = item.computer_inventory_item_id;
    update public.computer_inventory_items
    set is_deleted = true,
        is_publicly_visible = false,
        serial_number = null,
        internal_notes = null
    where id = item.computer_inventory_item_id;
  end if;

  -- Deliberately preserve serial_snapshot/IMEI and every financial snapshot.
  update public.pos_sale_items
  set purged_at = timezone('utc', now()),
      purged_by = auth.uid()
  where id = p_item_id;
end;
$$;

grant execute on function public.purge_archived_device_data(uuid) to authenticated;

-- Historical vouchers are accounting records. They can be cancelled, archived and
-- compacted, but not physically deleted through the application.
create or replace function public.permanently_delete_expired_voucher(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'Only the owner can manage archived vouchers';
  end if;
  raise exception 'Vouchers are retained for accounting. Archive and purge device data instead.';
end;
$$;

grant execute on function public.permanently_delete_expired_voucher(uuid) to authenticated;
