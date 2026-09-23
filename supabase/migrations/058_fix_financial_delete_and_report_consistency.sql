-- Keep dashboard/report money in sync with inventory corrections and prevent
-- active computer sales from being orphaned by inventory deletion.

-- Expose only correction-deleted inventory IDs to authenticated active staff.
-- This lets dashboard/reports ignore mistaken registrations without exposing
-- Delete History details to staff roles.
create or replace function public.get_correction_deleted_inventory_ids()
returns table (
  category public.product_category,
  inventory_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select 'phone'::public.product_category, d.device_id
  from public.deleted_inventory_items d
  where public.is_active_staff()

  union all

  select 'computer'::public.product_category, c.computer_id
  from public.deleted_computer_inventory_items c
  where public.is_active_staff();
$$;

revoke all on function public.get_correction_deleted_inventory_ids() from public;
grant execute on function public.get_correction_deleted_inventory_ids() to authenticated;

-- A computer may only be moved to Delete History while it is back in stock.
-- If it is currently sold, the voucher must be cancelled first so the stock
-- restore and financial reversal happen through cancel_pos_sale().
create or replace function public.delete_computer_inventory_item(
  p_computer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_snapshot jsonb;
  v_photo_paths jsonb;
begin
  if v_actor is null or not public.is_manager_or_owner() then
    raise exception 'Only an owner or manager can delete a computer inventory item';
  end if;

  if exists (
    select 1
    from public.pos_sale_items i
    where i.computer_inventory_item_id = p_computer_id
      and i.is_voided = false
  ) then
    raise exception 'This computer is linked to an active sale. Cancel the voucher first.';
  end if;

  select to_jsonb(c)
  into v_snapshot
  from public.computer_inventory_items c
  where c.id = p_computer_id
    and c.is_deleted = false
    and c.status = 'in_stock'
  for update;

  if v_snapshot is null then
    raise exception 'Only an in-stock computer can be moved to Delete History';
  end if;

  select coalesce(
    jsonb_agg(p.storage_path order by p.sort_order asc, p.created_at asc),
    '[]'::jsonb
  )
  into v_photo_paths
  from public.computer_inventory_photos p
  where p.computer_id = p_computer_id;

  insert into public.deleted_computer_inventory_items (
    computer_id,
    snapshot,
    photo_paths,
    deleted_by,
    deleted_at
  )
  values (
    p_computer_id,
    v_snapshot,
    v_photo_paths,
    v_actor,
    timezone('utc', now())
  )
  on conflict (computer_id)
  do update
  set
    snapshot = excluded.snapshot,
    photo_paths = excluded.photo_paths,
    deleted_by = excluded.deleted_by,
    deleted_at = excluded.deleted_at;

  update public.computer_inventory_items
  set
    is_deleted = true,
    is_publicly_visible = false,
    deleted_by = v_actor,
    deleted_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_computer_id;
end;
$$;

revoke all on function public.delete_computer_inventory_item(uuid) from public;
grant execute on function public.delete_computer_inventory_item(uuid) to authenticated;

-- Hard delete is permitted only after the active sale relationship is gone.
-- A cancelled voucher has is_voided=true items, so it is safe to cascade those
-- rows and let cleanup_empty_cancelled_voucher remove the empty cancelled header.
create or replace function public.permanently_delete_computer_inventory_item_with_photos(
  p_history_id uuid
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_computer_id uuid;
  v_photo_paths_json jsonb;
  v_photo_paths text[];
begin
  if v_actor is null or not public.is_manager_or_owner() then
    raise exception 'Only an owner or manager can permanently delete computer inventory data';
  end if;

  select h.computer_id, h.photo_paths
  into v_computer_id, v_photo_paths_json
  from public.deleted_computer_inventory_items h
  where h.id = p_history_id
  for update;

  if v_computer_id is null then
    raise exception 'Computer Delete History item not found';
  end if;

  if exists (
    select 1
    from public.pos_sale_items i
    where i.computer_inventory_item_id = v_computer_id
      and i.is_voided = false
  ) then
    raise exception 'This computer is still linked to an active sale. Cancel the voucher first.';
  end if;

  if not exists (
    select 1
    from public.computer_inventory_items c
    where c.id = v_computer_id
      and c.is_deleted = true
  ) then
    raise exception 'Computer must be in Delete History before permanent deletion';
  end if;

  if v_photo_paths_json is null or jsonb_array_length(v_photo_paths_json) = 0 then
    select coalesce(
      jsonb_agg(p.storage_path order by p.sort_order asc, p.created_at asc),
      '[]'::jsonb
    )
    into v_photo_paths_json
    from public.computer_inventory_photos p
    where p.computer_id = v_computer_id;
  end if;

  select coalesce(array_agg(value), '{}'::text[])
  into v_photo_paths
  from jsonb_array_elements_text(coalesce(v_photo_paths_json, '[]'::jsonb)) as value;

  delete from public.deleted_computer_inventory_items
  where id = p_history_id;

  delete from public.computer_inventory_items
  where id = v_computer_id
    and is_deleted = true;

  return v_photo_paths;
end;
$$;

revoke all on function public.permanently_delete_computer_inventory_item_with_photos(uuid) from public;
grant execute on function public.permanently_delete_computer_inventory_item_with_photos(uuid) to authenticated;

-- Repair old orphaned voucher headers created before the delete guard existed.
-- These rows have no active sale item, so they must not contribute to revenue.
update public.pos_sales s
set
  voided_at = coalesce(s.voided_at, timezone('utc', now())),
  void_reason = coalesce(
    nullif(trim(s.void_reason), ''),
    'Auto-cancelled orphan voucher during financial consistency repair'
  )
where s.voided_at is null
  and not exists (
    select 1
    from public.pos_sale_items i
    where i.sale_id = s.id
      and i.is_voided = false
  );
