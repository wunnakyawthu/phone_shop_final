# Version 26 update

- Fixed daily, weekly, and monthly report boundaries. Timestamp records use local calendar-day boundaries, while computer purchases use date-only boundaries, avoiding timezone shifts to the previous day.
- Added Telegram URL to Settings → Public store details, the public Contact page, and the catalog footer.
- Added a localized sign-in success notification. Existing sign-in errors remain visible.

## Database

Telegram requires `supabase/migrations/059_telegram_store_contact.sql` to be applied to the Supabase project used by this build. Apply migrations to the test project first. Do not push them to production during local testing.
