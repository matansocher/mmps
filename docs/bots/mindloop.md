# Mindloop

**Brain-Training Mini-App** - Original React game collection backed by MongoDB.

## Overview

Mindloop is not a Telegram bot. It is a standalone React application from `apps/mindloop-web` served at `/mindloop/*`. It ships 11 original brain-training games across 5 skill categories behind a shared game shell, and persists player progress (best scores, favorites, play history) to MongoDB keyed by Telegram user id.

The app runs inside Telegram as a mini-app (identity comes from verified Telegram `initData`) and can also run in a plain browser during local dev. Device-only preferences (theme, sound, reduced motion) and onboarding "seen" flags intentionally never leave the device.

## Features

- **13 Original Games** - Across 5 skill categories: Memory, Attention, Speed, Problem Solving, and Flexibility
- **Shared Game Shell** - Intro / how-to, countdown, live score HUD, and a results screen
- **First-Run Onboarding** - A short, swipeable story flow ending in a real ~20s taste round; shows once per device, is skippable, and can be replayed from Settings
- **Meta Screens** - Home (category grid), Stats, Settings (theme / sound / reduced motion / replay intro / reset), a once-per-day progress modal, and streaks
- **Server-Backed Progress** - Best scores, favorites, and play history sync to Mongo; the client reconciles local and server state once on startup with a non-destructive merge, then pushes each finished run and favorites change
- **Offline-First** - localStorage stays the working store and offline fallback; server writes are best-effort / fire-and-forget
- **Dark Mode** - Full theme support

## Configuration

```bash
MONGO_DB_URL=mongodb://localhost:27017
MINDLOOP_TELEGRAM_BOT_TOKEN=...
```

Mindloop does not use `LOCAL_ACTIVE_BOT_ID`; it initializes independently of bot selection. The Telegram bot token is used only to verify mini-app `initData` server-side. In local dev without a verified user, an `X-Mindloop-Dev-User` header (or a fixed dev id) provides a durable identity.

## Getting Started

Run the backend and React development server:

```bash
npm run dev
npm run dev:mindloop-web
```

## API Routes

All `/api/mindloop/player*` routes require an authenticated Telegram (or dev) user.

- `GET /api/mindloop/player` - Load the player's best scores, favorites, and history
- `POST /api/mindloop/player/result` - Record a finished run (updates best score + play history)
- `PUT /api/mindloop/player/favorites` - Replace the player's favorites list
- `POST /api/mindloop/player/sync` - Merge a full client snapshot (non-destructive union, used once on startup)
- `GET /mindloop/*` - Serve the built React SPA

## Database

**Database name**: `Mindloop`

**Collection**: `Players`

Each document is keyed by the Telegram user id (`_id`) and stores `bestScores`, `favorites`, and a newest-first `history` (capped at 500 entries), plus `createdAt` / `updatedAt`.

## Scheduled Tasks

Mindloop does not register scheduled tasks.

## Next Steps

- [Bot and Web Feature Overview](/bots/overview)
- [Database Architecture](/architecture/database)
- [Project Structure](/architecture/project-structure)
