# Phone workflow update

## Included
- Used-phone seller information is optional and no longer blocks purchases.
- New-phone source/supplier information is optional.
- Purchase source name/phone is stored as a transaction snapshot, not forced into Contacts.
- Non-owner phone staff cannot override Purchased By in the UI.
- Purchase date uses the browser's local date instead of UTC date.
- Successful purchases show the human purchase number.
- Phone Inventory page with search and status/new-used filters.
- Phone Device Detail page with device, pricing and purchase-source information.
- Migration 006 updates the database/RPC for optional purchase-source information.

## Required once after replacing the project
From the project folder, run:

npx supabase db push
npm run typecheck
npm run dev

The database push is required before testing a new purchase because the UI now sends optional source information supported by migration 006.

## v5 - Purchase photo RPC bug fix
- Added migration `009_fix_purchase_photo_rpc_ambiguity.sql`.
- Fixed PostgreSQL `column reference "purchase_id" is ambiguous` in `create_purchase_with_devices_and_photos`.

## v6 — Mobile phone intake + model catalog

- Mobile-first purchase form with clearer system fonts, 16px inputs and a sticky save action.
- Apple selection hides RAM immediately.
- Search/type model combobox with reusable add/configure model workflow.
- Added `phone_model_specs` catalog for model-specific colors, storage choices and IMEI count.
- Seeded Apple iPhone catalog from original iPhone through current models; model options remain editable.
- Color/storage are constrained by the selected model (for example iPhone 13 does not offer 64 GB).
- IMEI inputs accept digits only and stop at exactly 15 digits; model catalog controls whether one or two IMEIs are required.
- Migration: `010_phone_model_catalog.sql`.

## v7 — mobile-first purchase workflow
- IMEI 2 is optional when a model supports a second IMEI; IMEI 1 remains required at exactly 15 digits.
- Added optional iPhone Region entry (LL/A, TH/A, CH/A, etc.) with suggestions plus free typing.
- Region is stored on the device record and shown in staff inventory/detail views.
- Purchase form is more phone-first: one-column fields on small screens, 16px+ controls, larger touch targets, iOS safe-area support, and clearer system-font typography.
- Photo picker no longer forces camera capture, allowing normal camera/gallery selection on iPhone and Android.
- Added migration 011_optional_imei2_iphone_region.sql.

## v14
- Fixed inventory edit saves failing on completed purchase_items when only photos/device fields changed.
- Owner purchase-price corrections now use the controlled financial-mutation guard only when the value actually changes.
- Mobile Edit Phone Save/Cancel action bar now sits above the bottom navigation and remains visible.
