-- Customer membership is saved in the same transaction as the voucher.
create or replace function public.sync_pos_customer_directory()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  customer_phone text := nullif(trim(new.customer_phone_snapshot), '');
  customer_name text := nullif(trim(new.customer_name_snapshot), '');
begin
  if customer_phone is null then return new; end if;
  insert into public.contacts(full_name, phone_number, contact_type, created_by, updated_by)
  values(coalesce(customer_name, 'Customer'), customer_phone, 'customer', new.sold_by, new.sold_by)
  on conflict (phone_number) where is_active
  do update set contact_type = case when contacts.contact_type = 'seller'
    then 'both'::public.contact_type else contacts.contact_type end,
    updated_by = excluded.updated_by
  returning id into new.customer_contact_id;
  return new;
end;
$$;
revoke all on function public.sync_pos_customer_directory() from public;
drop trigger if exists pos_sales_customer_directory on public.pos_sales;
create trigger pos_sales_customer_directory before insert on public.pos_sales
for each row execute function public.sync_pos_customer_directory();

-- Recover phone-bearing customers from non-cancelled vouchers without changing
-- historical voucher amounts, names or references.
insert into public.contacts(full_name, phone_number, contact_type, created_by, updated_by)
select distinct on (trim(s.customer_phone_snapshot))
  coalesce(nullif(trim(s.customer_name_snapshot), ''), 'Customer'),
  trim(s.customer_phone_snapshot), 'customer'::public.contact_type, s.sold_by, s.sold_by
from public.pos_sales s
where s.voided_at is null
  and nullif(trim(s.customer_phone_snapshot), '') is not null
order by trim(s.customer_phone_snapshot), s.sale_date desc, s.id
on conflict (phone_number) where is_active
do update set contact_type = case when contacts.contact_type = 'seller'
  then 'both'::public.contact_type else contacts.contact_type end;
