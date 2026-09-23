-- =========================================================
-- 024_computer_photos.sql
-- Computer Inventory Photos
-- 2–6 photos per computer.
-- First photo is treated as the cover photo.
-- =========================================================

create table if not exists public.computer_inventory_photos (
  id uuid primary key default gen_random_uuid(),

  computer_id uuid not null
    references public.computer_inventory_items(id)
    on delete cascade,

  storage_path text not null,

  sort_order integer not null default 0
    check (sort_order >= 0),

  created_at timestamptz not null
    default timezone('utc', now()),

  unique (computer_id, storage_path)
);

create index if not exists
computer_inventory_photos_computer_idx
on public.computer_inventory_photos (
  computer_id,
  sort_order
);

alter table public.computer_inventory_photos
enable row level security;


-- =========================================================
-- READ
-- Logged-in staff can read computer photos.
-- =========================================================

drop policy if exists
computer_inventory_photos_authenticated_read
on public.computer_inventory_photos;

create policy
computer_inventory_photos_authenticated_read
on public.computer_inventory_photos
for select
to authenticated
using (true);


-- =========================================================
-- INSERT
-- Owner / Manager / Computer Staff
-- =========================================================

drop policy if exists
computer_inventory_photos_staff_insert
on public.computer_inventory_photos;

create policy
computer_inventory_photos_staff_insert
on public.computer_inventory_photos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    join public.user_roles r
      on r.user_id = p.id
    where p.id = auth.uid()
      and p.is_active = true
      and r.role in (
        'owner',
        'manager',
        'computer_staff'
      )
  )
);


-- =========================================================
-- UPDATE
-- Needed for photo ordering.
-- Owner / Manager / Computer Staff
-- =========================================================

drop policy if exists
computer_inventory_photos_staff_update
on public.computer_inventory_photos;

create policy
computer_inventory_photos_staff_update
on public.computer_inventory_photos
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.user_roles r
      on r.user_id = p.id
    where p.id = auth.uid()
      and p.is_active = true
      and r.role in (
        'owner',
        'manager',
        'computer_staff'
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    join public.user_roles r
      on r.user_id = p.id
    where p.id = auth.uid()
      and p.is_active = true
      and r.role in (
        'owner',
        'manager',
        'computer_staff'
      )
  )
);


-- =========================================================
-- DELETE
-- Needed when editing/removing a photo.
-- Owner / Manager / Computer Staff
-- =========================================================

drop policy if exists
computer_inventory_photos_staff_delete
on public.computer_inventory_photos;

create policy
computer_inventory_photos_staff_delete
on public.computer_inventory_photos
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    join public.user_roles r
      on r.user_id = p.id
    where p.id = auth.uid()
      and p.is_active = true
      and r.role in (
        'owner',
        'manager',
        'computer_staff'
      )
  )
);