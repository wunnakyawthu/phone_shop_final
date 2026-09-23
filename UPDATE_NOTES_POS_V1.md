# Phone & Computer POS V1

## Included

- Separate `/app/phones/pos` and `/app/computers/pos` workflows.
- Multiple devices per sale; categories cannot be mixed.
- Optional customer name/phone with walk-in default and phone-based purchase history.
- Per-item discount from 0% to 50%.
- Cash, KBZ Pay, AYA Pay, Wave Pay and bank-transfer payment methods.
- Printable receipt with editable store address, footer and warranty terms.
- Completed items are marked sold and removed from the public catalog.
- Unified receipt ledger for phone and computer customer history.

## Deploy the database change

```bash
npx supabase db push
npx supabase gen types typescript --project-id kfmfsuoscpmjumvmzuuc --schema public > src/types/database.generated.ts
npm run typecheck
npm run dev
```

Migration: `supabase/migrations/043_phone_computer_pos.sql`
