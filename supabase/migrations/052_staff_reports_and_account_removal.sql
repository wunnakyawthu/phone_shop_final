alter table public.profiles add column if not exists deleted_at timestamptz;

create or replace function public.list_managed_staff()
returns table(id uuid,full_name text,email text,phone text,is_active boolean,role public.app_role,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select p.id,p.full_name,p.email,p.phone,p.is_active,r.role,p.created_at
  from public.profiles p join public.user_roles r on r.user_id=p.id
  where public.is_manager_or_owner() and p.deleted_at is null
  order by p.is_active desc,p.created_at desc;
$$;

drop policy if exists pos_sales_staff_read on public.pos_sales;
create policy pos_sales_staff_read on public.pos_sales for select to authenticated
using (public.is_active_staff() and public.can_access_category(category));

drop policy if exists pos_sale_items_staff_read on public.pos_sale_items;
create policy pos_sale_items_staff_read on public.pos_sale_items for select to authenticated
using (exists(select 1 from public.pos_sales s where s.id=sale_id and public.can_access_category(s.category)));

create or replace function public.cancel_pos_sale(p_sale_id uuid,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); sale_row public.pos_sales%rowtype; item_row record;
begin
  if not public.is_manager_or_owner() then raise exception 'Only an owner or manager can cancel a voucher'; end if;
  select * into sale_row from public.pos_sales where id=p_sale_id for update;
  if not found then raise exception 'Voucher not found'; end if;
  if sale_row.voided_at is not null then raise exception 'Voucher was already cancelled'; end if;
  for item_row in select * from public.pos_sale_items where sale_id=p_sale_id and is_voided=false for update loop
    if item_row.purged_at is not null then raise exception 'Purged device data cannot be restored'; end if;
    if item_row.device_unit_id is not null then
      update public.device_units set status='in_stock',is_publicly_visible=true,updated_by=actor where id=item_row.device_unit_id and status='sold';
      if not found then raise exception 'Phone cannot be restored because its status changed'; end if;
    else
      update public.computer_inventory_items set status='in_stock',is_publicly_visible=true,is_deleted=false where id=item_row.computer_inventory_item_id and status='sold';
      if not found then raise exception 'Computer cannot be restored because its status changed'; end if;
    end if;
  end loop;
  update public.pos_sale_items set is_voided=true where sale_id=p_sale_id;
  update public.pos_sales set voided_at=timezone('utc',now()),voided_by=actor,
    void_reason=coalesce(nullif(trim(p_reason),''),'Sale entered by mistake') where id=p_sale_id;
end; $$;
grant execute on function public.cancel_pos_sale(uuid,text) to authenticated;
