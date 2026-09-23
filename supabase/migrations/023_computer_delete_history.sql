-- Computer inventory Delete History / Restore workflow.
-- Owner / Manager only.
-- computer_staff can never delete or restore inventory records.

-- =========================================================
-- 1. Add soft-delete columns to computer inventory
-- =========================================================

alter table public.computer_inventory_items
add column if not exists is_deleted boolean not null default false;

alter table public.computer_inventory_items
add column if not exists deleted_at timestamptz;

alter table public.computer_inventory_items
add column if not exists deleted_by uuid
references public.profiles(id)
on delete set null;


-- =========================================================
-- 2. Computer delete history table
-- =========================================================

create table if not exists public.deleted_computer_inventory_items (
  id uuid primary key default gen_random_uuid(),

  computer_id uuid not null unique
    references public.computer_inventory_items(id)
    on delete cascade,

  snapshot jsonb not null default '{}'::jsonb,

  deleted_by uuid
    references public.profiles(id)
    on delete set null,

  deleted_at timestamptz not null
    default timezone('utc', now())
);


create index if not exists
deleted_computer_inventory_items_deleted_at_idx
on public.deleted_computer_inventory_items(deleted_at desc);


alter table public.deleted_computer_inventory_items
enable row level security;


drop policy if exists
deleted_computer_inventory_items_management_read
on public.deleted_computer_inventory_items;


create policy
deleted_computer_inventory_items_management_read
on public.deleted_computer_inventory_items
for select
to authenticated
using (public.is_manager_or_owner());


-- =========================================================
-- 3. Move computer to Delete History
-- =========================================================

create or replace function
public.delete_computer_inventory_item(
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
begin

  if v_actor is null
     or not public.is_manager_or_owner()
  then
    raise exception
      'Only an owner or manager can delete a computer inventory item';
  end if;


  select to_jsonb(c)
  into v_snapshot
  from public.computer_inventory_items c
  where c.id = p_computer_id
    and c.is_deleted = false
  for update;


  if v_snapshot is null then
    raise exception
      'Computer not found or already in Delete History';
  end if;


  insert into public.deleted_computer_inventory_items (
    computer_id,
    snapshot,
    deleted_by,
    deleted_at
  )
  values (
    p_computer_id,
    v_snapshot,
    v_actor,
    timezone('utc', now())
  )
  on conflict (computer_id)
  do update
  set
    snapshot = excluded.snapshot,
    deleted_by = excluded.deleted_by,
    deleted_at = excluded.deleted_at;


  update public.computer_inventory_items
  set
    is_deleted = true,
    deleted_by = v_actor,
    deleted_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = p_computer_id;

end;
$$;


revoke all
on function public.delete_computer_inventory_item(uuid)
from public;

grant execute
on function public.delete_computer_inventory_item(uuid)
to authenticated;


-- =========================================================
-- 4. Get Computer Delete History
-- =========================================================

create or replace function
public.get_deleted_computer_inventory()
returns table (
  history_id uuid,
  computer_id uuid,
  brand text,
  model_name text,
  serial_number text,
  computer_type text,
  condition text,
  deleted_by_name text,
  deleted_at timestamptz,
  snapshot jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    h.id,
    h.computer_id,

    h.snapshot ->> 'brand',

    h.snapshot ->> 'model_name',

    h.snapshot ->> 'serial_number',

    h.snapshot ->> 'computer_type',

    h.snapshot ->> 'condition',

    p.full_name,

    h.deleted_at,

    h.snapshot

  from public.deleted_computer_inventory_items h

  left join public.profiles p
    on p.id = h.deleted_by

  where public.is_manager_or_owner()

  order by h.deleted_at desc;
$$;


revoke all
on function public.get_deleted_computer_inventory()
from public;

grant execute
on function public.get_deleted_computer_inventory()
to authenticated;


-- =========================================================
-- 5. Restore computer from Delete History
-- =========================================================

create or replace function
public.restore_deleted_computer_inventory_item(
  p_history_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_computer_id uuid;
begin

  if v_actor is null
     or not public.is_manager_or_owner()
  then
    raise exception
      'Only an owner or manager can restore computer inventory data';
  end if;


  select h.computer_id
  into v_computer_id
  from public.deleted_computer_inventory_items h
  where h.id = p_history_id
  for update;


  if v_computer_id is null then
    raise exception
      'Computer Delete History item not found';
  end if;


  if not exists (
    select 1
    from public.computer_inventory_items c
    where c.id = v_computer_id
      and c.is_deleted = true
  ) then
    raise exception
      'Only a computer currently in Delete History can be restored';
  end if;


  update public.computer_inventory_items
  set
    is_deleted = false,
    deleted_by = null,
    deleted_at = null,
    updated_at = timezone('utc', now())
  where id = v_computer_id;


  delete from public.deleted_computer_inventory_items
  where id = p_history_id;

end;
$$;


revoke all
on function public.restore_deleted_computer_inventory_item(uuid)
from public;

grant execute
on function public.restore_deleted_computer_inventory_item(uuid)
to authenticated;


-- =========================================================
-- 6. Permanent Delete
-- =========================================================

create or replace function
public.permanently_delete_computer_inventory_item(
  p_history_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_computer_id uuid;
begin

  if v_actor is null
     or not public.is_manager_or_owner()
  then
    raise exception
      'Only an owner or manager can permanently delete computer inventory data';
  end if;


  select h.computer_id
  into v_computer_id
  from public.deleted_computer_inventory_items h
  where h.id = p_history_id
  for update;


  if v_computer_id is null then
    raise exception
      'Computer Delete History item not found';
  end if;


  if not exists (
    select 1
    from public.computer_inventory_items c
    where c.id = v_computer_id
      and c.is_deleted = true
  ) then
    raise exception
      'Computer must be in Delete History before permanent deletion';
  end if;


  delete from public.deleted_computer_inventory_items
  where id = p_history_id;


  delete from public.computer_inventory_items
  where id = v_computer_id
    and is_deleted = true;

end;
$$;


revoke all
on function public.permanently_delete_computer_inventory_item(uuid)
from public;

grant execute
on function public.permanently_delete_computer_inventory_item(uuid)
to authenticated;