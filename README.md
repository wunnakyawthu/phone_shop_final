# Phone & Computer Shop

Production-ready React, Vite, TypeScript and Supabase application for phone and
computer purchasing, inventory, POS sales, contacts, warranty, reporting and a
mobile-first public catalog.

## Local setup

Create `.env.local` from `.env.example` and add the browser-safe Supabase values:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then run:

```bash
npm install
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy admin-staff --project-ref YOUR_PROJECT_REF
npm run dev
```

The staff Edge Function uses Supabase's automatically provided server secrets.
Never put the service-role key in `.env.local`, a `VITE_` variable, Git, or Vercel.

## Deploy to Vercel

1. Import this folder/repository into Vercel.
2. Keep the framework preset as Vite; build command `npm run build`; output `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Production and Preview.
4. Deploy, then add the Vercel URL to Supabase Authentication → URL Configuration.

`vercel.json` contains the SPA rewrite required for direct links and browser refreshes.
The public customer catalog remains independent from the staff light/dark preference.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

## Version 1 operational notes

- Apply every migration through `059_telegram_store_contact.sql` before use.
- Telegram contact links are configured in Settings → Public store details and shown on the public Contact page and footer.
- Redeploy `admin-staff` after updating this version; it contains the staff-account
  removal repair.
- Staff deletion revokes login and hides the account while keeping historical staff
  attribution on purchases and sales.
- Choosing **Supplier** in Phone Purchase saves or reuses the contact in Suppliers.
  Choosing **One-time seller** keeps only the purchase snapshot.
- Back up the Supabase database and Storage according to the shop's recovery policy.
