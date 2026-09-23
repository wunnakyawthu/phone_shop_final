-- Save an explicitly selected phone-purchase supplier in the shared supplier
-- directory, while ordinary one-time sellers remain purchase snapshots only.

create or replace function public.resolve_purchase_supplier(
  p_full_name text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  supplier_id uuid;
  supplier_name text := nullif(trim(coalesce(p_full_name, '')), '');
  supplier_phone text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if actor is null or not public.is_active_staff() then
    raise exception 'Authentication is required';
  end if;
  if not public.can_access_category('phone'::public.product_category) then
    raise exception 'You do not have permission to record phone suppliers';
  end if;
  if supplier_name is null or supplier_phone is null then
    raise exception 'Supplier name and phone number are required';
  end if;

  select id into supplier_id
  from public.contacts
  where phone_number = supplier_phone and is_active
  order by created_at
  limit 1
  for update;

  if supplier_id is null then
    insert into public.contacts(
      full_name, phone_number, contact_type, is_active, created_by, updated_by
    ) values (
      supplier_name, supplier_phone, 'seller', true, actor, actor
    )
    returning id into supplier_id;
  else
    update public.contacts
    set full_name = supplier_name,
        contact_type = case
          when contact_type = 'customer' then 'both'::public.contact_type
          else contact_type
        end,
        updated_by = actor
    where id = supplier_id;
  end if;

  return supplier_id;
end;
$$;

revoke all on function public.resolve_purchase_supplier(text, text) from public;
grant execute on function public.resolve_purchase_supplier(text, text) to authenticated;
