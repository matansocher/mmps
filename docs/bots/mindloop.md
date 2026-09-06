# Mindloop

**Brain-Training Mini-App** - Original React game collection backed by MongoDB.

## Overview

Mindloop is not a Telegram bot. It is a standalone React application from `apps/mindloop-web` served at `/mindloop/*`. It ships 11 original brain-training games across 5 skill categories behind a shared game shell, and persists player progress (best scores, favorites, play history) to MongoDB keyed by Telegram user id.

The app runs inside Telegram as a mini-app (identity comes from verified Telegram `initData`) and can also run in a plain browser during local dev. Device-only preferences (theme, sound, reduced motion) and onboarding "seen" flags intentionally never leave the device.

## Features

- **11 Original Games** - Across 5 skill categories: Memory, Attention, Speed, Problem Solving, and Flexibility
- **Shared Game Shell** - Intro / how-to, countdown, live score HUD, and a results screen
- **First-Run Onboarding** - A short, swipeable story flow ending in a real ~20s taste round; shows once per device, is skippable, and can be replayed from Settings
- **Meta Screens** - Home (category grid), Stats, Settings (theme / sound / reduced motion / replay intro / reset), a once-per-day progress modal, and streaks
- **Server-Backed Progress** - Best scores, favorites, and play history sync to Mongo; the client reconciles local and server state once on startup with a non-destructive merge, then pushes each finished run and favorites change
- **Offline-First** - localStorage stays the working store and offline fallback; server writes are best-effort / fire-and-forget
- **Dark Mode** - Full theme support

### Gameplay

- Timed games use elapsed-time countdowns, so delayed browser updates do not extend a run. Each finished run is recorded once, and replay starts with fresh game state.
- Rail Router builds connected routes before scrambling their rotations, ensuring every puzzle has a solution. Numbered trains and station flags supplement color cues, and completing a level adds eight seconds.
- Raindrops spaces problems into three lanes and clears the lowest drop matching an answer. Use the on-screen keypad or number keys, Enter to solve, Backspace to erase, and Delete to clear.
- Game controls have visible keyboard focus, touch-friendly targets, and reduced-motion support. Results show the gap to your personal best.

### Difficulty and replayability

Difficulty increases with successful play, without turning timed games into survival runs. Visual density, speed, and preview durations have safety limits; reaching a limit does not end the run. Timed scores still depend on how many challenges you solve before time expires.

| Game | Run format | Progression |
| --- | --- | --- |
| Grid Recall | Until a mistake | Grids grow to 5×5, with no more than 12 highlighted tiles so late patterns do not become trivial. Previews shorten from 2s to 1.2s; round rewards keep growing. |
| Pair Match | 60 seconds | Successive shuffled boards grow from 4 to 6 to 8 pairs. Later mismatches are visible for less time. Scores accumulate across boards, including partial boards, with increasing board-clear bonuses and no time refill. |
| Sequence Echo | Until a mistake | Each round adds another sequence step; longer sequences earn more points. |
| Sequence Track | Until a mistake | More dots and targets move faster, then tracking grows from 3.2s to 6s with shorter previews. Selection remains untimed and round rewards keep growing. |
| Odd One Out | 45 seconds | Larger grids and subtler color differences; incorrect taps cost time. |
| Flash Match | 45 seconds, after memorizing the first symbol | Five levels introduce more nonmatching symbols that share either shape or color with the previous symbol. Both must match for YES. |
| Quick Math | 45 seconds | Correct streaks unlock larger operands, more operators, then multi-step and parenthesized expressions. Levels and rewards continue beyond the previous level-12 cap. |
| Raindrops | 60 seconds or three misses | Solving drops increases fall speed, spawn frequency, and arithmetic difficulty. Higher-level drops earn more points; rewards use each drop's difficulty when spawned. |
| Color Clash | 40 seconds | Five levels expand the palette from three to five colors and make word/ink conflicts more frequent. |
| Rail Router | 90 seconds, plus 8 seconds per cleared level | Larger boards, more routes, increasingly scrambled tracks, and higher completion rewards. Every board remains solvable. |
| Ebb & Flow | 45 seconds | Five levels introduce more rule switches and more conflicts between pointing and movement. |

Color Clash, Flash Match, and Ebb & Flow advance every four correct answers, show progress toward the next level, and award more points at higher levels. Existing best scores and history are retained; scoring changes do not reset progress.

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
