-- New computer purchases should be visible on the public website by default.
-- Existing records are intentionally left unchanged; only future inserts use this default.

alter table public.computer_inventory_items
alter column is_publicly_visible set default true;
