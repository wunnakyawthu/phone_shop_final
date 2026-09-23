# v11 — Restore from Delete History

- Owner/Manager can restore a deleted phone from Delete History back to `in_stock`.
- Restore has a confirmation dialog.
- The phone's previous public website visibility is restored from the deletion snapshot.
- Restore writes an inventory correction transaction and audit event.
- Staff accounts still have no delete/restore controls.
- Permanent delete remains a separate final action.
- New migration: `015_restore_deleted_inventory_item.sql`.
