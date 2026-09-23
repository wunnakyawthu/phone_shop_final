alter table public.pos_sale_items
  add column if not exists purchase_cost_snapshot_mmk bigint not null default 0 check (purchase_cost_snapshot_mmk >= 0),
  add column if not exists warranty_duration_days integer not null default 30 check (warranty_duration_days between 0 and 3650),
  add column if not exists warranty_expires_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists purged_at timestamptz,
  add column if not exists purged_by uuid references public.profiles(id) on delete set null;

update public.pos_sale_items i set
  purchase_cost_snapshot_mmk = coalesce(
    (select pi.purchase_price_mmk from public.purchase_items pi where pi.device_unit_id=i.device_unit_id),
    (select c.purchase_price::bigint from public.computer_inventory_items c where c.id=i.computer_inventory_item_id),
    0
  ),
  warranty_expires_at = coalesce(i.warranty_expires_at, i.created_at + interval '30 days');

create or replace function public.create_pos_sale_v2(p_category public.product_category, p_sale jsonb, p_items jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  sale_id uuid;
  warranty_days integer := coalesce(nullif(p_sale->>'warranty_duration_days','')::integer,30);
begin
  if warranty_days < 0 or warranty_days > 3650 then raise exception 'Warranty duration must be between 0 and 3650 days'; end if;
  sale_id := public.create_pos_sale(p_category,p_sale,p_items);
  update public.pos_sale_items i set
    purchase_cost_snapshot_mmk = coalesce(
      (select pi.purchase_price_mmk from public.purchase_items pi where pi.device_unit_id=i.device_unit_id),
      (select c.purchase_price::bigint from public.computer_inventory_items c where c.id=i.computer_inventory_item_id),
      0
    ),
    warranty_duration_days = warranty_days,
    warranty_expires_at = case when warranty_days=0 then timezone('utc',now()) else timezone('utc',now()) + make_interval(days=>warranty_days) end
  where i.sale_id=sale_id;
  return sale_id;
end; $$;

grant execute on function public.create_pos_sale_v2(public.product_category,jsonb,jsonb) to authenticated;

create or replace function public.archive_expired_warranty_item(p_item_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_owner() then raise exception 'Only the owner can archive warranty records'; end if;
  update public.pos_sale_items set archived_at=timezone('utc',now())
  where id=p_item_id and warranty_expires_at<=timezone('utc',now()) and archived_at is null;
  if not found then raise exception 'Warranty item is not expired or was already archived'; end if;
end; $$;

create or replace function public.purge_archived_device_data(p_item_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare item record; photo record;
begin
  if not public.is_owner() then raise exception 'Only the owner can purge device data'; end if;
  select * into item from public.pos_sale_items where id=p_item_id and archived_at is not null and warranty_expires_at<=timezone('utc',now()) for update;
  if not found then raise exception 'Archive the expired warranty item before purging'; end if;
  if item.purged_at is not null then raise exception 'Device data was already purged'; end if;

  if item.device_unit_id is not null then
    for photo in select storage_path from public.device_photos where device_unit_id=item.device_unit_id loop
      delete from storage.objects where bucket_id='device-images' and name=photo.storage_path;
    end loop;
    delete from public.device_photos where device_unit_id=item.device_unit_id;
    update public.device_units set status='voided',is_publicly_visible=false,imei_1='PURGED-'||left(id::text,12),imei_2=null,internal_notes=null,important_message_type=null,important_message_other=null,updated_by=auth.uid() where id=item.device_unit_id;
  else
    for photo in select storage_path from public.computer_inventory_photos where computer_id=item.computer_inventory_item_id loop
      delete from storage.objects where bucket_id='device-images' and name=photo.storage_path;
    end loop;
    delete from public.computer_inventory_photos where computer_id=item.computer_inventory_item_id;
    update public.computer_inventory_items set is_deleted=true,is_publicly_visible=false,serial_number=null,internal_notes=null where id=item.computer_inventory_item_id;
  end if;
  update public.pos_sale_items set serial_snapshot=null,purged_at=timezone('utc',now()),purged_by=auth.uid() where id=p_item_id;
end; $$;

grant execute on function public.archive_expired_warranty_item(uuid) to authenticated;
grant execute on function public.purge_archived_device_data(uuid) to authenticated;
