-- Owner/manager staff administration. Accounts are deactivated instead of hard
-- deleted so purchase, sale and audit history always keeps its staff attribution.

drop policy if exists profiles_management_all on public.profiles;
create policy profiles_management_all on public.profiles
for all to authenticated
using (public.is_manager_or_owner())
with check (public.is_manager_or_owner());

drop policy if exists roles_management_all on public.user_roles;
create policy roles_management_all on public.user_roles
for all to authenticated
using (public.is_manager_or_owner())
with check (public.is_manager_or_owner());

create or replace function public.list_managed_staff()
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  is_active boolean,
  role public.app_role,
  created_at timestamptz
)
language sql stable security definer set search_path=public
as $$
  select p.id, p.full_name, p.email, p.phone, p.is_active, r.role, p.created_at
  from public.profiles p
  join public.user_roles r on r.user_id=p.id
  where public.is_manager_or_owner()
  order by p.is_active desc, p.created_at desc;
$$;

create or replace function public.manage_staff_profile(
  p_user_id uuid,
  p_full_name text,
  p_phone text,
  p_role public.app_role,
  p_is_active boolean
)
returns void language plpgsql security definer set search_path=public
as $$
declare
  actor_role text := coalesce(public.current_app_role()::text, '');
  target_role text;
begin
  if not public.is_manager_or_owner() then raise exception 'Only an owner or manager can manage staff'; end if;
  select role::text into target_role from public.user_roles where user_id=p_user_id;
  if p_user_id=auth.uid() and not p_is_active then raise exception 'You cannot deactivate your own account'; end if;
  if actor_role='manager' and (target_role in ('owner','manager') or p_role::text in ('owner','manager')) then
    raise exception 'Managers can manage phone and computer staff only';
  end if;
  update public.profiles set full_name=trim(p_full_name), phone=nullif(trim(p_phone),''), is_active=p_is_active where id=p_user_id;
  if not found then raise exception 'Staff profile not found'; end if;
  insert into public.user_roles(user_id,role,assigned_by)
  values(p_user_id,p_role,auth.uid())
  on conflict(user_id) do update set role=excluded.role,assigned_by=auth.uid(),assigned_at=timezone('utc',now());
end;
$$;

grant execute on function public.list_managed_staff() to authenticated;
grant execute on function public.manage_staff_profile(uuid,text,text,public.app_role,boolean) to authenticated;

-- Keep computer purchase sellers/suppliers visible in the shared directory.
insert into public.contacts(full_name,phone_number,contact_type)
select distinct on (trim(c.seller_phone))
  coalesce(nullif(trim(c.purchase_from),''),'Computer supplier'),
  trim(c.seller_phone),
  'seller'::public.contact_type
from public.computer_inventory_items c
where nullif(trim(c.seller_phone),'') is not null
  and not exists (
    select 1 from public.contacts x where x.phone_number=trim(c.seller_phone)
  )
order by trim(c.seller_phone), c.created_at desc;

create or replace function public.sync_computer_supplier_contact()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if nullif(trim(new.seller_phone),'') is not null and not exists (
    select 1 from public.contacts where phone_number=trim(new.seller_phone)
  ) then
    insert into public.contacts(full_name,phone_number,contact_type,created_by,updated_by)
    values(coalesce(nullif(trim(new.purchase_from),''),'Computer supplier'),trim(new.seller_phone),'seller',auth.uid(),auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists computer_supplier_contact_sync on public.computer_inventory_items;
create trigger computer_supplier_contact_sync
after insert or update of purchase_from,seller_phone on public.computer_inventory_items
for each row execute function public.sync_computer_supplier_contact();
