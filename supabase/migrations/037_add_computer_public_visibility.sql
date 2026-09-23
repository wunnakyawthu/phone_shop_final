-- Add website visibility control for computer inventory
alter table public.computer_inventory_items
add column if not exists is_publicly_visible boolean
not null
default false;