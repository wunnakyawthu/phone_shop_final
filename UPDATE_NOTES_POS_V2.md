# POS V2: Warranty, safe purge and daily reports

## New workflow

- Customer information is now shown before inventory selection.
- Discounts use fixed 5% steps from 0% to 50%.
- Each sale has a selectable warranty period (none, 7/14 days, 1/2/3/6 months or 1 year).
- Reports provide daily income, purchase cost, cost of sold items and gross profit.
- Daily phone/computer sales and purchase lists are separated.
- Warranty records are grouped into Active, Expired and Archived.
- Owners can archive expired warranties, then safely purge photos, serial/IMEI and private device details.
- Financial snapshots and invoice history remain after purge so reports stay correct.

## Required database update

```bash
npx supabase db push
npx supabase gen types typescript --project-id kfmfsuoscpmjumvmzuuc --schema public > src/types/database.generated.ts
npm install
npm run typecheck
npm run dev
```

Migration: `supabase/migrations/044_warranty_profit_reports_and_safe_purge.sql`
