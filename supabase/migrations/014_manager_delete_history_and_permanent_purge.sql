-- Two-stage inventory deletion workflow.
-- 1) Owner/manager moves an incorrect in-stock registration to Delete History.
-- 2) Owner/manager can permanently purge it from Delete History after a second confirmation.
-- Staff accounts never receive delete permission.

alter type public.app_role add value if not exists 'manager';

create or replace function public.is_manager_or_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_active_staff()
    and coalesce(public.current_app_role()::text, '') in ('owner', 'manager');
$$;

-- Managers can work across phone/computer categories without receiving owner-only settings powers.
create or replace function public.profile_can_access_category(
  p_user_id uuid,
  p_category public.product_category
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.user_roles r on r.user_id = p.id
    where p.id = p_user_id
      and p.is_active
      and (
        r.role::text in ('owner', 'manager')
        or (r.role::text = 'phone_staff' and p_category = 'phone')
        or (r.role::text = 'computer_staff' and p_category = 'computer')
      )
  );
$$;

create table if not exists public.deleted_inventory_items (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null unique,
  category public.product_category not null,
  brand_name text not null,
  model_name text not null,
  identifier text,
  snapshot jsonb not null default '{}'::jsonb,
  photo_paths jsonb not null default '[]'::jsonb,
  deleted_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz not null default timezone('utc', now())
);

create index if not exists deleted_inventory_items_deleted_at_idx
  on public.deleted_inventory_items (deleted_at desc);

alter table public.deleted_inventory_items enable row level security;

drop policy if exists deleted_inventory_items_management_read on public.deleted_inventory_items;
create policy deleted_inventory_items_management_read
on public.deleted_inventory_items
for select
to authenticated
using (public.is_manager_or_owner());

-- Allow a tightly-controlled permanent purge RPC to remove otherwise immutable child records.
create or replace function public.prevent_financial_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if current_setting('app.allow_hard_delete', true) = 'on' then
      return old;
    end if;
    raise exception '% records are append-only and cannot be deleted', tg_table_name;
  end if;

  if old.status = 'completed'
     and current_setting('app.allow_financial_mutation', true) is distinct from 'on'
  then
    raise exception 'Completed % records can only be changed through a controlled void/correction workflow', tg_table_name;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_financial_child_mutation()
returns trigger
language plpgsql
as $$
declare
  parent_status public.financial_status;
begin
  if tg_op = 'DELETE' and current_setting('app.allow_hard_delete', true) = 'on' then
    return old;
  end if;

  if tg_table_name = 'purchase_items' then
    select p.status into parent_status
    from public.purchases p
    where p.id = coalesce(new.purchase_id, old.purchase_id);
  elsif tg_table_name = 'sale_items' then
    select s.status into parent_status
    from public.sales s
    where s.id = coalesce(new.sale_id, old.sale_id);
  elsif tg_table_name = 'sale_payments' then
    select s.status into parent_status
    from public.sales s
    where s.id = coalesce(new.sale_id, old.sale_id);
  else
    raise exception 'Unsupported financial child table: %', tg_table_name;
  end if;

  if tg_op = 'DELETE' then
    raise exception '% records are append-only and cannot be deleted', tg_table_name;
  end if;

  if parent_status = 'completed'
     and current_setting('app.allow_financial_mutation', true) is distinct from 'on'
  then
    raise exception '% records belong to a completed financial transaction and cannot be changed', tg_table_name;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_append_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.allow_hard_delete', true) = 'on' then
    return old;
  end if;
  raise exception '% is append-only and cannot be changed', tg_table_name;
end;
$$;

-- Replace the v9 delete RPC: it now means "move to Delete History", not hard delete.
create or replace function public.delete_phone_inventory_device(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_purchase_id uuid;
  v_brand_name text;
  v_model_name text;
  v_identifier text;
  v_snapshot jsonb;
  v_photo_paths jsonb;
begin
  if v_actor is null or not public.is_manager_or_owner() then
    raise exception 'Only an owner or manager can delete an inventory registration';
  end if;

  if not exists (
    select 1 from public.device_units
    where id = p_device_id and category = 'phone' and status = 'in_stock'
  ) then
    raise exception 'Only an in-stock phone can be moved to Delete History';
  end if;

  if exists (select 1 from public.sale_items where device_unit_id = p_device_id) then
    raise exception 'A phone linked to a sale cannot be deleted';
  end if;

  select pi.purchase_id into v_purchase_id
  from public.purchase_items pi
  where pi.device_unit_id = p_device_id;

  select b.name, pm.name, coalesce(d.imei_1, d.serial_number), to_jsonb(d)
    into v_brand_name, v_model_name, v_identifier, v_snapshot
  from public.device_units d
  join public.product_models pm on pm.id = d.product_model_id
  join public.brands b on b.id = pm.brand_id
  where d.id = p_device_id;

  select coalesce(jsonb_agg(dp.storage_path order by dp.sort_order), '[]'::jsonb)
    into v_photo_paths
  from public.device_photos dp
  where dp.device_unit_id = p_device_id;

  insert into public.deleted_inventory_items (
    device_id, category, brand_name, model_name, identifier,
    snapshot, photo_paths, deleted_by
  ) values (
    p_device_id, 'phone', v_brand_name, v_model_name, v_identifier,
    v_snapshot, v_photo_paths, v_actor
  )
  on conflict (device_id) do update
    set snapshot = excluded.snapshot,
        photo_paths = excluded.photo_paths,
        deleted_by = excluded.deleted_by,
        deleted_at = timezone('utc', now());

  update public.device_units
  set status = 'voided', is_publicly_visible = false, updated_by = v_actor
  where id = p_device_id;

  insert into public.inventory_transactions(
    device_unit_id, transaction_type, status_before, status_after,
    purchase_id, sale_id, reason, performed_by
  ) values (
    p_device_id, 'correction', 'in_stock', 'voided',
    null, null, 'Moved to Delete History by owner/manager', v_actor
  );

  perform public.audit_event(
    'inventory_corrected',
    'device_unit',
    p_device_id,
    jsonb_build_object('action', 'moved_to_delete_history', 'purchase_id', v_purchase_id)
  );
end;
$$;

revoke all on function public.delete_phone_inventory_device(uuid) from public;
grant execute on function public.delete_phone_inventory_device(uuid) to authenticated;

create or replace function public.get_deleted_phone_inventory()
returns table (
  history_id uuid,
  device_id uuid,
  brand_name text,
  model_name text,
  identifier text,
  snapshot jsonb,
  photo_paths jsonb,
  deleted_by_name text,
  deleted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    h.id,
    h.device_id,
    h.brand_name,
    h.model_name,
    h.identifier,
    h.snapshot,
    h.photo_paths,
    p.full_name,
    h.deleted_at
  from public.deleted_inventory_items h
  left join public.profiles p on p.id = h.deleted_by
  where public.is_manager_or_owner()
    and h.category = 'phone'
  order by h.deleted_at desc;
$$;

revoke all on function public.get_deleted_phone_inventory() from public;
grant execute on function public.get_deleted_phone_inventory() to authenticated;

create or replace function public.permanently_delete_phone_inventory_item(p_history_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_device_id uuid;
  v_purchase_id uuid;
  v_photo_paths text[];
begin
  if v_actor is null or not public.is_manager_or_owner() then
    raise exception 'Only an owner or manager can permanently delete inventory data';
  end if;

  select h.device_id,
         coalesce(array(select jsonb_array_elements_text(h.photo_paths)), array[]::text[])
    into v_device_id, v_photo_paths
  from public.deleted_inventory_items h
  where h.id = p_history_id
  for update;

  if v_device_id is null then
    raise exception 'Delete History item not found';
  end if;

  if exists (select 1 from public.sale_items where device_unit_id = v_device_id) then
    raise exception 'A phone linked to a sale cannot be permanently deleted';
  end if;

  if not exists (
    select 1 from public.device_units
    where id = v_device_id and category = 'phone' and status = 'voided'
  ) then
    raise exception 'The phone must be in Delete History before permanent deletion';
  end if;

  select pi.purchase_id into v_purchase_id
  from public.purchase_items pi
  where pi.device_unit_id = v_device_id;

  perform set_config('app.allow_hard_delete', 'on', true);

  delete from public.device_photos where device_unit_id = v_device_id;
  delete from public.device_costs where device_unit_id = v_device_id;
  delete from public.inventory_transactions where device_unit_id = v_device_id;
  delete from public.purchase_items where device_unit_id = v_device_id;
  delete from public.device_units where id = v_device_id;

  if v_purchase_id is not null
     and not exists (select 1 from public.purchase_items where purchase_id = v_purchase_id)
  then
    delete from public.void_records where purchase_id = v_purchase_id;
    delete from public.inventory_transactions where purchase_id = v_purchase_id;
    delete from public.purchases where id = v_purchase_id;
  end if;

  delete from public.deleted_inventory_items where id = p_history_id;

  perform public.audit_event(
    'inventory_corrected',
    'device_unit',
    v_device_id,
    jsonb_build_object('action', 'permanently_deleted', 'history_id', p_history_id)
  );

  return v_photo_paths;
end;
$$;

revoke all on function public.permanently_delete_phone_inventory_item(uuid) from public;
grant execute on function public.permanently_delete_phone_inventory_item(uuid) to authenticated;
