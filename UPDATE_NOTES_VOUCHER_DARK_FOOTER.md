# Voucher detail, dashboard icons, dark mode and footer

- Dashboard KPI cards now use meaningful SVG icons.
- Language and appearance controls are visibly labelled in the staff account panel.
- Dark mode surfaces, borders, inputs, navigation and status cards use a unified slate palette.
- Warranty rows open a detailed voucher showing device, price, discount, customer, payment and selling staff.
- Owners can permanently delete an expired voucher after an irreversible-action warning.
- Sold Phone and Computer detail pages show their linked voucher.
- Customer pages now use a full multi-column footer with shop navigation, contact and social links.

## Database update

```bash
npx supabase db push
```

Migration: `045_expired_voucher_permanent_delete.sql`
