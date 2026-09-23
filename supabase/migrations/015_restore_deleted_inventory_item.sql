-- Restore an item from Delete History back to active inventory.
-- Owner/manager only. Staff accounts never receive this permission.

create or replace function public.restore_deleted_phone_inventory_item(p_history_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_device_id uuid;
  v_original_public_visibility boolean := false;
begin
  if v_actor is null or not public.is_manager_or_owner() then
    raise exception 'Only an owner or manager can restore inventory data';
  end if;

  select
    h.device_id,
    coalesce((h.snapshot ->> 'is_publicly_visible')::boolean, false)
  into
    v_device_id,
    v_original_public_visibility
  from public.deleted_inventory_items h
  where h.id = p_history_id
    and h.category = 'phone'
  for update;

  if v_device_id is null then
    raise exception 'Delete History item not found';
  end if;

  if exists (
    select 1
    from public.sale_items
    where device_unit_id = v_device_id
  ) then
    raise exception 'A phone linked to a sale cannot be restored to stock';
  end if;

  if not exists (
    select 1
    from public.device_units
    where id = v_device_id
      and category = 'phone'
      and status = 'voided'
  ) then
    raise exception 'Only a phone currently in Delete History can be restored';
  end if;

  update public.device_units
  set
    status = 'in_stock',
    is_publicly_visible = v_original_public_visibility,
    updated_by = v_actor
  where id = v_device_id;

  insert into public.inventory_transactions(
    device_unit_id,
    transaction_type,
    status_before,
    status_after,
    purchase_id,
    sale_id,
    reason,
    performed_by
  ) values (
    v_device_id,
    'correction',
    'voided',
    'in_stock',
    null,
    null,
    'Restored from Delete History by owner/manager',
    v_actor
  );

  delete from public.deleted_inventory_items
  where id = p_history_id;

  perform public.audit_event(
    'inventory_corrected',
    'device_unit',
    v_device_id,
    jsonb_build_object(
      'action', 'restored_from_delete_history',
      'history_id', p_history_id,
      'restored_public_visibility', v_original_public_visibility
    )
  );
end;
$$;

revoke all on function public.restore_deleted_phone_inventory_item(uuid) from public;
grant execute on function public.restore_deleted_phone_inventory_item(uuid) to authenticated;
