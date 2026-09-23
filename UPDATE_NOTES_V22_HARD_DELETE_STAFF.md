# Version 22 — Permanent staff deletion

## Changed

- Staff deletion now hard-deletes the Supabase Auth user.
- The associated profile, role, identities and login sessions are removed.
- Historical transaction rows remain intact; nullable actor UUIDs are cleared.
- Voucher `sold_by_name_snapshot` text remains available for printed and historical vouchers.
- Previously anonymized `Deleted staff` Auth users are removed when migration 056 is applied.
- Foreign-key cleanup is allowed through immutable financial and audit-table guards only for nested database constraint actions; normal application updates remain protected.

## Required deployment order

```bash
npx supabase db push
npx supabase functions deploy admin-staff --project-ref YOUR_PROJECT_REF
```

Apply the database migration before deploying the Edge Function.
