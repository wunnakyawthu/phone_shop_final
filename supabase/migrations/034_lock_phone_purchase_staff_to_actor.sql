-- Lock phone purchase accountability to the authenticated account.
-- For phone purchases, Checked By and Purchased By must always be the
-- staff account that actually creates the purchase.
--
-- This trigger is server-side protection, so changing request JSON or
-- browser code cannot impersonate another staff member.

create or replace function public.enforce_phone_purchase_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
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

  -- Keep historical staff attribution immutable after creation.
  if tg_op = 'UPDATE' then
    new.checked_by_user_id := old.checked_by_user_id;
    new.purchased_by_user_id := old.purchased_by_user_id;
    new.created_by := old.created_by;
  end if;

  return new;
end;
$$;

drop trigger if exists purchases_enforce_phone_actor
on public.purchases;

create trigger purchases_enforce_phone_actor
before insert or update on public.purchases
for each row
execute function public.enforce_phone_purchase_actor();
