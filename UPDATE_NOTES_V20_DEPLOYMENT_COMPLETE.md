# V20 deployment-complete update

- Added explicit one-time seller vs saved supplier selection to Phone Purchase.
- Added the `resolve_purchase_supplier` database RPC so selected suppliers are saved
  safely and reusable from the purchase form and Supplier directory.
- Repaired staff login removal in the `admin-staff` Edge Function and surfaced the
  actual server error instead of a generic non-2xx message.
- Made Phone/Computer sale report rows open complete voucher details.
- Made Phone/Computer purchase report rows open the purchased device details,
  including product, IMEI/serial, prices, source and status.
- Replaced mouse-wheel-sensitive price filters and POS discount fields with numeric
  text inputs.
- Added Vercel SPA rewrite configuration and updated deployment instructions.

Required remote updates:

```bash
npx supabase db push
npx supabase functions deploy admin-staff --project-ref YOUR_PROJECT_REF
```
