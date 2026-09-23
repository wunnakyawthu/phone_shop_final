-- Add flexible storage support for computers
-- Supports:
-- SSD only
-- HDD only
-- SSD + HDD


alter table public.computer_inventory_items

add column if not exists primary_storage_type text,

add column if not exists primary_storage_size text,

add column if not exists secondary_storage_type text,

add column if not exists secondary_storage_size text;