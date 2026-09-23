# V25: Contact transaction history, Telegram and login feedback

- Daily computer purchases now use local calendar-date boundaries for the
  database `date` field. This prevents a date-only purchase from being omitted
  by a UTC timestamp boundary.
- Customer and supplier cards show the number of purchased/supplied items and
  expandable product history with reference, date, device identifier and amount.
- Store settings now include a Telegram URL. The public Contact page and footer
  display its link when configured.
- Login shows a visible success toast and a clear invalid-credentials message.
  Supabase intentionally returns the same authentication error for an
  unregistered email and a wrong password, so the app does not reveal which
  account exists.
- Apply `supabase/migrations/059_telegram_store_contact.sql` with
  `npx supabase db push` before deploying this version.

Validation: `npm run typecheck` and `npm run build`.
