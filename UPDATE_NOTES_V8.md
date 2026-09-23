# v8 — Public catalog polish

- Battery Health input is constrained to 0–100 in the UI and validated before the purchase RPC.
- Public catalog RPCs now expose the optional iPhone region code while keeping IMEI, purchase cost, seller data, staff data and internal notes private.
- Public device detail shows Region when available.
- Tapping/clicking the main product photo opens a full-screen viewer with previous/next controls and Escape-to-close on desktop.
- Public-facing heavy `font-black` typography was replaced with a cleaner bold weight and the system font stack was tuned for iPhone, Android and Windows.
- New migration: `012_public_region_and_catalog_polish.sql`.
