# Version 21 — Staff deletion fix

## Fixed

- Staff deletion no longer fails with `Password cannot be longer than 72 characters`.
- Deleted staff login credentials are still revoked before the profile is archived.
- Historical purchase, sale, voucher and sold-by records remain preserved.
- Deleted staff remain hidden from the active staff-management list.

## Required deployment step

Redeploy the updated Edge Function after extracting this version:

```bash
npx supabase functions deploy admin-staff --project-ref YOUR_PROJECT_REF
```

No new database migration is required for this fix.
