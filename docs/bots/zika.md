# Zika — Redesign Showcase

Zika is a static React showcase of three redesign options for [zika.co.il](https://zika.co.il) (Zika Industries). It lives in `apps/zika-web`, and Express serves it at `/zika/*`. It has no API routes, no database and no bot.

## What it shows

A cover page for management links to three concepts. Each concept has a home page and a Z‑11 product page:

| Concept | Folder |
| --- | --- |
| Bold | `src/concepts/bold/` |
| Catalog | `src/concepts/catalog/` |
| Friendly | `src/concepts/friendly/` |

- The site is in Hebrew and laid out right to left.
- All copy, prices and images come from `apps/zika-web/src/content/index.ts`, scraped from zika.co.il and shop.zika.co.il.
- The cart is client-side only (`localStorage`). Checkout links out to the real shop.
- Each concept keeps its CSS scoped under `.c-<slug>` so the three designs don't leak into each other.

## Backend

`initZika(app)` (`src/features/zika/zika.init.ts`) serves `apps/zika-web/dist` as static files and falls back to `index.html` for any `/zika/*` path. It boots regardless of `LOCAL_ACTIVE_BOT_ID`.

## Development

```bash
npm run dev:zika-web     # Vite dev server
npm run build:zika-web   # build into apps/zika-web/dist
```
