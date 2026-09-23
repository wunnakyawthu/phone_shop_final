-- Permanently delete staff identities without deleting business transactions.
-- Transaction-facing names are already stored as immutable text snapshots.

-- A foreign-key ON DELETE SET NULL action is executed by PostgreSQL from
-- inside a constraint trigger. Allow only those nested updates through the
-- normal financial/append-only guards. Direct application updates still run
-- at trigger depth 1 and remain protected exactly as before.
create or replace function public.prevent_financial_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and pg_trigger_depth() > 1 then
    return new;
  end if;

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

create or replace function public.prevent_append_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and pg_trigger_depth() > 1 then
    return new;
  end if;

  if tg_op = 'DELETE' and current_setting('app.allow_hard_delete', true) = 'on' then
    return old;
  end if;

  raise exception '% is append-only and cannot be changed', tg_table_name;
end;
$$;

create or replace function public.enforce_phone_purchase_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'UPDATE' and pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.category <> 'phone' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if v_actor is null then
      raise exception 'Authentication is required for phone purchases';
    end if;
    new.checked_by_user_id := v_actor;
    new.purchased_by_user_id := v_actor;
    new.created_by := v_actor;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.checked_by_user_id := old.checked_by_user_id;
    new.purchased_by_user_id := old.purchased_by_user_id;
    new.created_by := old.created_by;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_computer_purchase_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'UPDATE' and pg_trigger_depth() > 1 then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if v_actor is null then
      raise exception 'Authentication is required';
    end if;
    new.purchased_by_user_id := v_actor;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.purchased_by_user_id := old.purchased_by_user_id;
  end if;

  return new;
end;
$$;

do $$
declare
  fk record;
begin
  -- Every audit/actor reference to profiles must allow the referenced staff
  -- profile to disappear. Keep the transaction row and clear only its UUID.
  for fk in
    select
      con.conname as constraint_name,
      ns.nspname as schema_name,
      cls.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace ns on ns.oid = cls.relnamespace
    join lateral unnest(con.conkey) with ordinality as key(attnum, ord) on true
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = key.attnum
    where con.contype = 'f'
      and con.confrelid = 'public.profiles'::regclass
      and array_length(con.conkey, 1) = 1
      and not (
        ns.nspname = 'public'
        and cls.relname = 'user_roles'
        and att.attname = 'user_id'
      )
  loop
    execute format(
      'alter table %I.%I alter column %I drop not null',
      fk.schema_name, fk.table_name, fk.column_name
    );
    execute format(
      'alter table %I.%I drop constraint %I',
      fk.schema_name, fk.table_name, fk.constraint_name
    );
    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references public.profiles(id) on delete set null',
      fk.schema_name, fk.table_name, fk.constraint_name, fk.column_name
    );
  end loop;
end $$;

-- Removing an Auth user now removes its application profile automatically.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- The permission row belongs to the profile and must disappear with it.
alter table public.user_roles
  drop constraint if exists user_roles_user_id_fkey;
alter table public.user_roles
  add constraint user_roles_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- Clean up accounts anonymized by the previous soft-delete implementation.
-- Deleting auth.users also removes identities/sessions through Auth's own FKs.
delete from auth.users u
where u.email like 'deleted-%@removed.invalid'
   or exists (
     select 1
     from public.profiles p
     where p.id = u.id
       and p.deleted_at is not null
   );
