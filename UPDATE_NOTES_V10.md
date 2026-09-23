# V10 — Manager + two-stage Delete History

## Workflow

- Owner and Manager can move an incorrect, unsold phone registration to **Delete History**.
- Staff accounts do not see a Delete button and the RPC also rejects staff deletion attempts.
- First delete is reversible at the data level: the device is marked `voided`, hidden from active inventory/public catalog, and its photos are retained for review in Delete History.
- Delete History is available at `/app/phones/deleted` to Owner and Manager only.
- A second confirmation can **permanently delete** the device registration and its purchase/inventory child records. If that purchase has no remaining devices, the empty purchase record is removed too.
- The permanent-delete action returns the Storage photo paths so the app removes the image files from Supabase Storage.

## Role

Migration 014 adds a `manager` app role. Managers can access both phone and computer categories, but owner-only Settings remain owner-only.

## Migration

Apply only:

`014_manager_delete_history_and_permanent_purge.sql`
