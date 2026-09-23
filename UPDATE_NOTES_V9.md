# V9 inventory maintenance

- Inventory cards are more compact and use up to four columns on desktop.
- Added Brand filter with Apple, Samsung and any other brands found in inventory.
- Added phone edit screen for model/specs, IMEIs, region, battery health, prices, public visibility, notes and photos.
- Existing photos can be removed and new photos added (2-6 total).
- Added owner-only Delete action. Delete is implemented as a safe inventory void: the phone disappears from active inventory/public catalog while financial and audit history remain preserved. Product photo rows/storage are removed.
- Added migration 013_inventory_edit_delete_and_filters.sql with secure edit/delete RPCs.
