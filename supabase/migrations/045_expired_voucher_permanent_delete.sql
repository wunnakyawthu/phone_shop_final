create or replace function public.permanently_delete_expired_voucher(p_sale_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare item record;
begin
  if not public.is_owner() then raise exception 'Only the owner can permanently delete vouchers'; end if;
  if not exists(select 1 from public.pos_sales where id=p_sale_id) then raise exception 'Voucher not found'; end if;
  if exists(select 1 from public.pos_sale_items where sale_id=p_sale_id and warranty_expires_at>timezone('utc',now())) then raise exception 'This voucher still has active warranty items'; end if;
  for item in select id,archived_at,purged_at from public.pos_sale_items where sale_id=p_sale_id loop
    if item.archived_at is null then perform public.archive_expired_warranty_item(item.id); end if;
    if item.purged_at is null then perform public.purge_archived_device_data(item.id); end if;
  end loop;
  delete from public.pos_sale_items where sale_id=p_sale_id;
  delete from public.pos_sales where id=p_sale_id;
end; $$;
grant execute on function public.permanently_delete_expired_voucher(uuid) to authenticated;
