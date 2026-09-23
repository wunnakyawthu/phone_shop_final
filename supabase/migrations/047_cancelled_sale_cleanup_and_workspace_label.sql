-- Allow permanently-deleted, previously-cancelled stock to release its audit link,
-- and make the management workspace subtitle owner-configurable.

alter table public.store_settings
  add column if not exists workspace_label text not null default 'Store workspace';

alter table public.pos_sale_items
  drop constraint if exists pos_sale_items_device_unit_id_fkey,
  add constraint pos_sale_items_device_unit_id_fkey
    foreign key (device_unit_id) references public.device_units(id) on delete cascade;

alter table public.pos_sale_items
  drop constraint if exists pos_sale_items_computer_inventory_item_id_fkey,
  add constraint pos_sale_items_computer_inventory_item_id_fkey
    foreign key (computer_inventory_item_id)
    references public.computer_inventory_items(id) on delete cascade;

create or replace function public.remove_empty_cancelled_voucher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_voided and not exists (
    select 1 from public.pos_sale_items where sale_id = old.sale_id
  ) then
    delete from public.pos_sales
    where id = old.sale_id and voided_at is not null;
  end if;
  return old;
end;
$$;

drop trigger if exists cleanup_empty_cancelled_voucher on public.pos_sale_items;
create trigger cleanup_empty_cancelled_voucher
after delete on public.pos_sale_items
for each row execute function public.remove_empty_cancelled_voucher();

drop function if exists public.get_public_store_branding();
create function public.get_public_store_branding()
returns table (
  store_name text,
  workspace_label text,
  logo_path text,
  phone text,
  facebook_url text,
  viber_url text,
  tiktok_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.store_name, s.workspace_label, s.logo_path, s.phone,
         s.facebook_url, s.viber_url, s.tiktok_url
  from public.store_settings s
  where s.id = true
  limit 1;
$$;

revoke all on function public.get_public_store_branding() from public;
grant execute on function public.get_public_store_branding() to anon, authenticated;
