alter table public.pos_sales add column if not exists sold_by_name_snapshot text;

update public.pos_sales s set sold_by_name_snapshot=coalesce(p.full_name,'Staff')
from public.profiles p where p.id=s.sold_by and s.sold_by_name_snapshot is null;

create or replace function public.set_pos_sale_seller_snapshot()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if nullif(trim(coalesce(new.sold_by_name_snapshot,'')),'') is null then
    select p.full_name into new.sold_by_name_snapshot from public.profiles p where p.id=new.sold_by;
  end if;
  new.sold_by_name_snapshot:=coalesce(new.sold_by_name_snapshot,'Staff');
  return new;
end; $$;

drop trigger if exists pos_sales_seller_snapshot on public.pos_sales;
create trigger pos_sales_seller_snapshot before insert on public.pos_sales
for each row execute function public.set_pos_sale_seller_snapshot();

alter table public.pos_sales drop constraint if exists pos_sales_customer_contact_id_fkey,
  add constraint pos_sales_customer_contact_id_fkey foreign key(customer_contact_id) references public.contacts(id) on delete set null;
alter table public.sales drop constraint if exists sales_customer_contact_id_fkey,
  add constraint sales_customer_contact_id_fkey foreign key(customer_contact_id) references public.contacts(id) on delete set null;
alter table public.purchases alter column seller_contact_id drop not null,
  drop constraint if exists purchases_seller_contact_id_fkey,
  add constraint purchases_seller_contact_id_fkey foreign key(seller_contact_id) references public.contacts(id) on delete set null;

create or replace function public.permanently_delete_contact(p_contact_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_manager_or_owner() then raise exception 'Only an owner or manager can permanently delete contacts'; end if;
  delete from public.contacts where id=p_contact_id;
  if not found then raise exception 'Contact not found'; end if;
end; $$;
revoke all on function public.permanently_delete_contact(uuid) from public;
grant execute on function public.permanently_delete_contact(uuid) to authenticated;
