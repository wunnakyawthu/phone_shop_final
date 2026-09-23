# V18 — Compact voucher archive

Migration `053_preserve_archive_financial_identity.sql` changes expired-warranty cleanup into a compact archive workflow.

## Retained permanently

- Voucher number and completed/cancelled status
- Phone/computer category
- IMEI or serial-number snapshot
- Brand/model snapshot
- Purchase and sale dates
- Purchase cost, listed selling price, discount, net selling price and profit
- Sold-by staff snapshot
- Customer name/phone snapshot
- Warranty start/end dates and terms

## Removed by purge

- Product photos and their storage objects
- Internal notes and non-essential operational device fields
- Live inventory identifiers are anonymized/released; the voucher snapshot remains unchanged

Historical vouchers can no longer be permanently deleted through the application. They may be cancelled before purge, archived after warranty expiry, and compacted with **Purge device data**.

## Apply

```bat
npm install
npx supabase link --project-ref kfmfsuoscpmjumvmzuuc
npx supabase db push
npx supabase gen types typescript --project-id kfmfsuoscpmjumvmzuuc --schema public > src\types\database.generated.ts
npm run typecheck
npm run dev
```
