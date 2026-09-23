-- Computer permanent-delete photo cleanup support.

alter table public.deleted_computer_inventory_items
add column if not exists photo_paths jsonb not null default '[]'::jsonb;

update public.deleted_computer_inventory_items h
set photo_paths = coalesce(
  (
    select jsonb_agg(
      p.storage_path
      order by p.sort_order asc, p.created_at asc
    )
    from public.computer_inventory_photos p
    where p.computer_id = h.computer_id
  ),
  '[]'::jsonb
)
where h.photo_paths = '[]'::jsonb;

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

  select coalesce(
    jsonb_agg(
      p.storage_path
      order by p.sort_order asc, p.created_at asc
    ),
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

create or replace function
public.permanently_delete_computer_inventory_item_with_photos(
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
  if v_actor is null
     or not public.is_manager_or_owner()
  then
    raise exception
      'Only an owner or manager can permanently delete computer inventory data';
  end if;

  select
    h.computer_id,
    h.photo_paths
  into
    v_computer_id,
    v_photo_paths_json
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

  if v_photo_paths_json is null
     or jsonb_array_length(v_photo_paths_json) = 0
  then
    select coalesce(
      jsonb_agg(
        p.storage_path
        order by p.sort_order asc, p.created_at asc
      ),
      '[]'::jsonb
    )
    into v_photo_paths_json
    from public.computer_inventory_photos p
    where p.computer_id = v_computer_id;
  end if;

  select coalesce(
    array_agg(value),
    '{}'::text[]
  )
  into v_photo_paths
  from jsonb_array_elements_text(
    coalesce(v_photo_paths_json, '[]'::jsonb)
  ) as value;

  delete from public.deleted_computer_inventory_items
  where id = p_history_id;

  delete from public.computer_inventory_items
  where id = v_computer_id
    and is_deleted = true;

  return v_photo_paths;
end;
$$;

revoke all
on function public.permanently_delete_computer_inventory_item_with_photos(uuid)
from public;

grant execute
on function public.permanently_delete_computer_inventory_item_with_photos(uuid)
to authenticated;
