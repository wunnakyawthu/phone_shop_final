# V23 — Public notes, contact page and UI polish

## Included

- Removed the Phone **Important Message** controls from purchase, edit and detail screens.
- Phone and computer **Internal Notes** are now shown on the public product detail page.
- Added a mobile-first public **Contact** page and navigation link.
- Added owner-configurable Google Maps URL; the supplied shop link is the default.
- Added address and map URL to the safe public branding RPC.
- Added scroll containers while keeping pagination for all four report lists.
- Reduced warranty terms text size on POS receipt preview and printed voucher.
- Replaced the wide branding message with a compact dismissible top notification.
- Added show/hide password control to the staff account creation form.

## Database update

Run from the project folder:

```powershell
npx supabase link --project-ref kfmfsuoscpmjumvmzuuc
npx supabase db push
npx supabase gen types typescript --project-id kfmfsuoscpmjumvmzuuc --schema public > src\types\database.generated.ts
```

`db push` applies pending migration `056_hard_delete_staff_accounts.sql` first and then `057_public_notes_contact_and_catalog.sql`.

Migration 057 keeps the retired Important Message columns for backward compatibility, clears their old values, and stops the application from reading or writing them.

## Verify locally

```powershell
npm install
npm run typecheck
npm run build
npm run dev
```

After the migration, test these flows:

1. Save a phone/computer with an Internal Note and open the public product page.
2. Open `/contact` on a phone and test the Google Maps button.
3. Save branding and confirm the compact top notification.
4. Create a staff account and test the password eye button.
5. Open Reports with more than ten rows and test both scrolling and pagination.
6. Complete a test sale and print one voucher to confirm the smaller warranty text.
