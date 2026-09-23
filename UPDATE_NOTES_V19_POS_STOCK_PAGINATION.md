# V19 — Amount discounts, stock alerts and scalable lists

## POS

- Discount is entered directly as an MMK amount per item.
- Blank discount means zero; the amount cannot be negative or exceed the selling price.
- Item final price and sale total update immediately.
- The database validates and stores the exact discount amount atomically.
- Receipt shows the original price and discount when a discount was applied.

## Stock alerts

- Dashboard warns when phone or computer stock is 15 items or fewer.
- Phone and Computer inventory pages show the same category-specific warning, including for staff who do not have Dashboard access.

## Printing

- Receipt printing now opens an isolated print document so the application/modal is not duplicated as a second receipt page.

## Large data sets

- POS catalog: search, min/max price, price sorting and 12-item pagination.
- Phone and Computer inventory: existing advanced filters plus min/max price and 12-item pagination.
- Reports: voucher/customer/product search, category and payment filters, and 10-row pagination per list.

## Apply

```bat
npm install
npx supabase link --project-ref kfmfsuoscpmjumvmzuuc
npx supabase db push
npx supabase gen types typescript --project-id kfmfsuoscpmjumvmzuuc --schema public > src\types\database.generated.ts
npm run typecheck
npm run dev
```

Migration `054_pos_discount_amount.sql` must be applied before testing new POS sales.
