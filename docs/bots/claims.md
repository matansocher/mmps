# Claims — Fraud Detection Landing Concepts

Claims is a static React showcase of three landing-page directions for an AI product. The product checks the receipts, photos and documents that customers submit with insurance claims and flags those that were edited, reused or invented. The pages are meant for insurance managers. The app lives in `apps/claims-web`, and Express serves it at `/claims/*`. It has no API routes, no database and no bot.

## What it shows

A cover page at `/claims/` links to three concepts. Each concept has its own product name and visual world:

| Concept | Path | World |
| --- | --- | --- |
| Lumen | `/claims/lumen` | Forensic lab, with a UV lamp that reveals the edits |
| Ledgerline | `/claims/ledgerline` | CFO annual report with a live savings model |
| Claimsight | `/claims/claimsight` | Live claims triage console |

- Every page is in English and switches to Hebrew (RTL) through a toggle. The choice is stored in `localStorage` (`claims-web:lang`), and `?lang=he` overrides it.
- All copy lives in `apps/claims-web/src/content/index.ts`. Industry figures are real and cited, from the Coalition Against Insurance Fraud, the FBI and the III. Product metrics and claims are illustrative and labeled as such.
- Shared components in `src/demo/`:
  - `ForensicDemo` is the animated doctor's-receipt analysis, where $450 became $1,450. It can switch between the altered and the genuine receipt.
  - `SavingsEstimator`.
  - `DemoForm` is visual only and sends nothing.
- Each concept keeps its CSS scoped under `.c-<slug>`.

## Backend

`initClaims(app)` (`src/features/claims/claims.init.ts`) serves `apps/claims-web/dist` as static files and falls back to `index.html` for any `/claims/*` path. It boots regardless of `LOCAL_ACTIVE_BOT_ID`.

## Development

```bash
npm run dev:claims-web     # Vite dev server on port 5290
npm run build:claims-web   # build into apps/claims-web/dist
```
