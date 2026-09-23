# Update notes

This package includes the latest fixes requested for Phone / Computer parity.

## Main changes

- Computer Edit now follows the same visual structure and interaction pattern as Phone Edit.
- Computer Edit keeps the 1.4-second success confirmation before returning to Computer Inventory.
- Computer Edit now supports Internal Notes.
- Computer Purchase Price is read-only for non-owner users in the edit UI, matching Phone Edit behavior.
- Computer price fields use numeric text input behavior so mouse-wheel scrolling cannot accidentally change the value.
- Computer edit photos are optional (0-6); the first photo remains the inventory/public cover.
- Computer inventory/detail keep the `On website` indicator when the item is publicly visible.
- Added migration `038_fix_public_computer_visibility.sql`.
  - Public computer catalog now returns only `in_stock`, non-deleted computers with `is_publicly_visible = true`.
  - Direct public computer detail URLs are also blocked when `is_publicly_visible = false`.
  - Existing computers created before the visibility column remain hidden by default because migration 037 created the column with `default false`.

## After replacing the project

Run:

```cmd
npx supabase db push
npx supabase gen types typescript --project-id kfmfsuoscpmjumvmzuuc --schema public > src/types/database.generated.ts
npm run typecheck
npm run dev
```

`npm run typecheck` was run successfully on the updated source before packaging.

## 2026-09-18 - Computer seller information matched to Phone

- Computer New Purchase now uses the same Seller/Supplier information pattern as Phone.
- Used purchase: Seller information / Seller Name / Phone / Purchase Notes.
- New purchase: Supplier information / Supplier Name / Phone / Purchase Notes.
- Added `seller_phone` and `purchase_notes` to `computer_inventory_items`.
- Added migration `039_match_computer_seller_information_to_phone.sql`.
- Computer detail now shows the saved seller/supplier phone when present.

## 2026-09-18 - New computer purchases public by default
- Added migration `040_default_new_computers_public.sql`.
- New rows in `computer_inventory_items` now default `is_publicly_visible` to `true`.
- Existing computer visibility values are not changed.
- The existing purchase RPC omits `is_publicly_visible`, so new purchases now inherit the database default and appear in the customer catalog immediately.
