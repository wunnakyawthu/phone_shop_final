-- Phase 2 foundation: extensions and closed business vocabularies.
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.app_role as enum ('owner', 'phone_staff', 'computer_staff');
create type public.product_category as enum ('phone', 'computer');
create type public.device_state as enum ('new', 'used');
create type public.inventory_status as enum ('in_stock', 'sold', 'voided');
create type public.phone_platform as enum ('iphone', 'android', 'other');
create type public.computer_type as enum ('macbook', 'windows_laptop', 'all_in_one', 'desktop_system_unit');
create type public.device_condition as enum ('excellent', 'very_good', 'good', 'fair');
create type public.important_message_type as enum ('none', 'battery', 'display', 'camera', 'face_id', 'other');
create type public.payment_method_code as enum ('cash', 'kbz_pay', 'aya_pay', 'wave_pay', 'bank_transfer');
create type public.financial_status as enum ('completed', 'voided');
create type public.inventory_transaction_type as enum ('purchase_received', 'sale_completed', 'void_purchase', 'void_sale', 'correction');
create type public.contact_type as enum ('seller', 'customer', 'both');
create type public.audit_action as enum ('user_created', 'user_deactivated', 'role_changed', 'brand_created', 'brand_updated', 'model_created', 'model_updated', 'purchase_created', 'purchase_voided', 'device_created', 'device_updated', 'device_published', 'sale_created', 'sale_voided', 'inventory_corrected', 'settings_updated', 'export_requested', 'export_completed', 'export_failed');
create type public.export_status as enum ('requested', 'processing', 'completed', 'failed', 'expired');
create type public.void_target_type as enum ('purchase', 'sale');
