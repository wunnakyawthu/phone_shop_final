# v15 — Mobile model picker + iPhone detail cleanup

- iPhone inventory detail no longer shows a RAM / Not recorded card.
- Replaced browser datalist model selection with a touch-friendly searchable model picker that works consistently on iPhone and Android.
- Existing model matches are case-insensitive and the input is normalized to the canonical catalog name (for example `iphone 13` becomes `iPhone 13`).
- New Apple model names are normalized to start with `iPhone`.
- Manager users are included in purchase staff master data.
- No database migration is required.
