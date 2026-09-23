# V24 — Map, footer credit and inventory date filters

## Included

- Added `Developed by Wunna Kyaw Thu` to the public footer.
- The developer name links to `https://www.facebook.com/wunna.kyaw.thu.wnkt`.
- Replaced the Contact page map placeholder with a visible Google Maps embed.
- The supplied Maps link still powers the exact external Directions button.
- Added recognizable Facebook and Viber icons on the Contact page and footer.
- Added purchase-date filters to both Phone Inventory and Computer Inventory.
- Date filtering works together with status, condition, brand, type and price filters.
- Changing the date resets pagination to page 1.

## Database

This update does not add a new migration. If migration 057 from V23 has not been applied yet, run:

```powershell
npx supabase db push
```

## Local verification

```powershell
npm install
npm run typecheck
npm run dev
```

Use `npm run build` only for the final deployment-ready check.
