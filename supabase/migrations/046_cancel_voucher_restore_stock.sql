-- Correct mistaken sales without losing the audit trail. Cancelled vouchers are
-- excluded by the application while every attached device returns to stock.

alter table public.pos_sales
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles(id) on delete set null,
  add column if not exists void_reason text;

alter table public.pos_sale_items
  add column if not exists is_voided boolean not null default false;

drop index if exists public.pos_sale_items_phone_unique;
drop index if exists public.pos_sale_items_computer_unique;
create unique index pos_sale_items_phone_unique
  on public.pos_sale_items (device_unit_id)
  where device_unit_id is not null and is_voided = false;
create unique index pos_sale_items_computer_unique
  on public.pos_sale_items (computer_inventory_item_id)
  where computer_inventory_item_id is not null and is_voided = false;

create index if not exists pos_sales_active_date_idx
  on public.pos_sales (sale_date desc) where voided_at is null;

create or replace function public.cancel_pos_sale(p_sale_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  sale_row public.pos_sales%rowtype;
  item_row record;
begin
  if not public.is_active_staff() then
    raise exception 'Only active staff can cancel a voucher';
  end if;

  select * into sale_row
  from public.pos_sales
  where id = p_sale_id
  for update;

  if not found then raise exception 'Voucher not found'; end if;
  if sale_row.voided_at is not null then raise exception 'Voucher was already cancelled'; end if;

  for item_row in
    select * from public.pos_sale_items
    where sale_id = p_sale_id and is_voided = false
    for update
  loop
    if item_row.purged_at is not null then
      raise exception 'Purged device data cannot be restored';
    end if;

    if item_row.device_unit_id is not null then
      update public.device_units
      set status = 'in_stock', is_publicly_visible = true, updated_by = actor
      where id = item_row.device_unit_id and status = 'sold';
      if not found then raise exception 'Phone cannot be restored because its status changed'; end if;
    else
      update public.computer_inventory_items
      set status = 'in_stock', is_publicly_visible = true, is_deleted = false
      where id = item_row.computer_inventory_item_id and status = 'sold';
      if not found then raise exception 'Computer cannot be restored because its status changed'; end if;
    end if;
  end loop;

  update public.pos_sale_items set is_voided = true where sale_id = p_sale_id;
  update public.pos_sales
  set voided_at = timezone('utc', now()),
      voided_by = actor,
      void_reason = coalesce(nullif(trim(p_reason), ''), 'Sale entered by mistake')
  where id = p_sale_id;
end;
$$;

grant execute on function public.cancel_pos_sale(uuid, text) to authenticated;
