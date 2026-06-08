# Credit-card expense XLSX imports

Drop monthly credit-card statement XLSX files in this folder. The importer reads everything from this directory by default.

Before running, adjust the `CONFIG` block at the top of `../import-credit-card-expenses.ts` (flip `dryRun` from `true` to `false` when you're ready to write to Mongo, or set `file` to import only a specific statement).

```bash
npx tsx src/features/chatbot/scripts/import-credit-card-expenses.ts
```

## Required filename convention

```
card-<last4>-<YYYY-MM>.xlsx
```

- `<last4>` — last 4 digits of the credit card.
- `<YYYY-MM>` — the statement's billing month (the month the statement charges, not the transaction dates inside).

### Examples

| Filename                    | Card    | Statement month |
| --------------------------- | ------- | --------------- |
| `card-1220-2026-05.xlsx`    | …1220   | May 2026        |
| `card-1220-2026-06.xlsx`    | …1220   | June 2026       |
| `card-4477-2026-06.xlsx`    | …4477   | June 2026       |

Files that don't match this pattern are rejected with a clear error — this is intentional so a misnamed file can't silently end up tagged with the wrong card or month.

## What the importer does

1. Parses the XLSX (ILS + USD sections, Hebrew sector/type columns).
2. Loads existing Mongo expenses for the relevant date range.
3. For each XLSX row, looks for an existing expense matching **date + amount + currency + vendor** (vendor compare is tolerant of `userVendor` overrides, casing, niqqud, and substring matches). Matches are skipped as duplicates.
4. Rows with no match are inserted with:
   - `messageId = card-xlsx:<last4>:<YYYY-MM>:<date>:<currency>:<amount>:<vendor>` — deterministic, so re-runs are idempotent thanks to the unique index on `messageId`.
   - `category` mapped from the Hebrew `ענף` column (falls back to `other`).
   - `type` mapped from the Hebrew `סוג עסקה` column (`הוראת קבע` → `bill`, otherwise `card_alert`).
5. Anything ambiguous (same date + amount but vendor doesn't clearly match) is skipped and reported for manual review.

After import, you can fix categorisation/vendor mistakes from the chatbot mini-app — those overrides are stored in `userCategory` / `userType` / `userVendor` and don't get clobbered by re-runs.
