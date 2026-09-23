# 2026-09-18 — Delete + Edit parity fixes

## Fixed

- Owner and Manager delete confirmation now shows a visible confirmation action. The previous shared dialog used a `bg-brand-600` utility that was not defined by the Tailwind theme, so the white confirm text appeared on a white background and looked like there was no delete action.
- Phone Edit now follows the New Phone Purchase layout:
  - Transaction information: Purchase Type, Purchase Date, Purchased By (read-only original account)
  - Seller/Supplier information: Name, Phone, Purchase Notes
  - Device 1 details
  - Product photos (0–6)
  - Internal Notes
  - Public website checkbox
- Computer Edit now follows the New Computer Purchase layout with the same sections and includes the public website checkbox.
- Computer Edit now edits Seller/Supplier Phone and Purchase Notes as well as the existing purchase fields.
- Phone Edit can now update purchase date/type and seller/supplier information through a controlled RPC while preserving the original Purchased By account. Purchase-cost corrections remain owner-only.
- Phone Edit photos now match purchase behavior: optional, maximum 6.

## Database migration

Run:

```cmd
npx supabase db push
```

This applies:

- `041_phone_edit_purchase_details_and_optional_photos.sql`

