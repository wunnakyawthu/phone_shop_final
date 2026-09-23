-- Managers share directory administration with owners. Contact deletion is a
-- reversible deactivation so historical vouchers and purchases keep their links.

drop policy if exists contacts_management_all on public.contacts;
create policy contacts_management_all on public.contacts
for all to authenticated
using (public.is_manager_or_owner())
with check (public.is_manager_or_owner());

create unique index if not exists contacts_active_phone_unique
on public.contacts(phone_number) where is_active;
