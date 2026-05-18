# Coach Mini App — Design Spec

**Date:** 2026-05-18
**Status:** Approved (brainstorming phase)
**Owner:** Matan
**Related:** [Stacker mini app spec](./2026-05-16-stacker-telegram-mini-app-design.md)

## Purpose

The Coach Telegram bot today is a text/command-driven interface for sports data: users type dates to get match summaries, use commands (`/tables`, `/matches`, `/actions`) and inline buttons to drill into leagues. The bot is functional but the experience is verbose — users read formatted plain-text tables and inline-button trees instead of seeing the data visually.

This spec defines a **Telegram mini app** ("Coach Web") that gives users a visual, dashboard-first view of the same data. It complements the bot (it does **not** replace it) — text-based date queries and settings remain in the bot.

## Scope

### In scope

- A React + Vite + Tailwind + framer-motion single-page mini app served as a Telegram WebApp
- Three screens: **Home dashboard**, **League detail**, **Match detail**
- A new HTTP API under `src/shared/coach-api/` with Telegram `initData` HMAC authentication (reusing the pattern from `stacker-api`)
- A launcher in the Coach bot that surfaces a "📱 פתח אפליקציה" web_app button
- Full Hebrew RTL support
- Sportcaster-broadcast visual identity (dark theme, neon accents, ticker-style live indicators)

### Out of scope

- Settings (subscription on/off, custom leagues) — stays in the bot's `/actions` flow
- Date browsing (yesterday / tomorrow / custom date) — stays in the bot's text input
- Push notifications — not changed by this spec
- New data sources — uses only the existing `scores-365` service

## Architecture

Mirror the structure used by stacker:

```
apps/coach-web/                # React mini app
  src/
    App.tsx
    main.tsx
    pages/
      HomePage.tsx
      LeagueDetailPage.tsx
      MatchDetailPage.tsx
    components/
      LiveMatchCard.tsx
      MatchCard.tsx
      LeagueSection.tsx
      LeagueTable.tsx
      MatchScoreboard.tsx
      EventsTimeline.tsx
      LineupsView.tsx
      StatsBars.tsx
    lib/
      api.ts                   # fetch wrapper, attaches initData
      telegram.ts              # WebApp.ready, BackButton, theme
    types.ts                   # DTOs imported from coach-api shape
  index.html
  package.json
  vite.config.ts
  tailwind.config.ts

src/shared/coach-api/
  auth.middleware.ts           # Telegram initData HMAC verify (reuse from stacker-api)
  coach.api.controller.ts      # routes
  dto.ts                       # request/response shapes
  index.ts

src/features/coach/
  launcher.service.ts          # adds web_app button to bot

src/shared/coach/              # already exists
  (subscriptions repo lives here; consumed by API to read user's customLeagues)
```

### Why this split

- `apps/coach-web/` is a sibling to `apps/stacker-web/` — clear visual parity, independent build
- `src/shared/coach-api/` mirrors `src/shared/stacker-api/` — same auth pattern, same conventions
- The API mounts on the same Express `app` already used by stacker (see `src/features/stacker/stacker.init.ts`). The coach init function accepts the `Express` instance, calls `registerCoachApiRoutes(app)`, and serves the SPA from `apps/coach-web/dist` at `/coach/*`. No new server/port.
- The bot feature only needs a launcher; everything else lives behind the API boundary

### Authentication

- All API requests include Telegram `initData` in a header (e.g. `X-Telegram-Init-Data`) — matches stacker-api convention
- `auth.middleware.ts` verifies the HMAC against `COACH_TELEGRAM_BOT_TOKEN`, parses `user.id` → `chatId`
- The verified `chatId` is the only user identifier the API trusts; it drives subscription/customLeagues lookups

## API contract

All endpoints require valid initData. Responses are JSON.

### `GET /api/coach/today`

Returns today's matches grouped for the home dashboard.

```ts
type TodayResponse = {
  readonly date: string;                  // Format: "YYYY-MM-DD"
  readonly live: ReadonlyArray<MatchSummary>;
  readonly groups: ReadonlyArray<{
    readonly competition: CompetitionRef;
    readonly matches: ReadonlyArray<MatchSummary>;
  }>;
};

type CompetitionRef = {
  readonly id: number;
  readonly name: string;
  readonly icon: string;
  readonly themeColor?: string;           // hex, optional
};

type MatchSummary = {
  readonly id: number;
  readonly home: TeamRef;
  readonly away: TeamRef;
  readonly status: 'scheduled' | 'live' | 'finished';
  readonly minute?: number;               // when status === 'live'
  readonly startTime: string;             // ISO
  readonly score?: { home: number; away: number };
  readonly competitionId: number;
};

type TeamRef = {
  readonly id: number;
  readonly name: string;
  readonly logoUrl?: string;
};
```

Behavior: calls `getSportsMatchesSummary(today)`, then:
- If the user has `customLeagues`, filter to those competitions only
- Otherwise return all competitions
- Split matches into `live` (top zone) and `groups` (per-competition sections)

### `GET /api/coach/competitions/:id`

Returns table + fixtures for one league.

```ts
type CompetitionDetailResponse = {
  readonly competition: CompetitionRef;
  readonly table: ReadonlyArray<TableRow>;
  readonly fixtures: ReadonlyArray<MatchSummary>;
};

type TableRow = {
  readonly rank: number;
  readonly team: TeamRef;
  readonly played: number;
  readonly goalDifference: number;
  readonly points: number;
  readonly zone?: 'champions' | 'europe' | 'relegation' | null;  // for row tinting
};
```

Behavior: parallel calls to `getSportsCompetitionTable(id)` + `getSportsCompetitionMatches(id)`.

### `GET /api/coach/matches/:id`

Returns rich detail for a single match.

```ts
type MatchDetailResponse = {
  readonly match: MatchSummary;
  readonly events?: ReadonlyArray<MatchEvent>;
  readonly lineups?: { home: LineupSide; away: LineupSide };
  readonly stats?: ReadonlyArray<StatBar>;
};

type MatchEvent = {
  readonly minute: number;
  readonly type: 'goal' | 'yellow-card' | 'red-card' | 'substitution';
  readonly playerName: string;
  readonly side: 'home' | 'away';
};

type LineupSide = {
  readonly formation?: string;            // e.g. "4-3-3"
  readonly players: ReadonlyArray<{ name: string; number?: number; position?: string }>;
};

type StatBar = {
  readonly label: string;                 // "Possession", "Shots", "Corners"
  readonly home: number;
  readonly away: number;
};
```

Behavior: uses `getMatchDetails(id)` + `getMatchTrends(id)` + `getPregameData(id)`; any section may be absent depending on what scores-365 returns (graceful degrade in the UI).

## Screens

### Home (`/`)

**Goal:** Show the user what's happening in sports right now, filtered to their followed leagues.

**Layout (top to bottom):**
1. Header strip — "Coach ⚽" + today's date in Hebrew
2. **Live zone** (only rendered if `live.length > 0`):
   - Section heading "🔴 LIVE"
   - Rich match cards: team crests, large score, pulsing red dot, minute indicator, league color stripe on the left edge
3. **League groups** — for each entry in `groups`:
   - Section heading: league icon + name (tap → League Detail)
   - Stack of match cards: team crests, score (or kickoff time for scheduled), status pill (FT / 20:00 / etc.), league color stripe

**Interactions:**
- Tap match card → Match Detail (`/match/:id`)
- Tap league section heading → League Detail (`/league/:id`)
- Pull-to-refresh re-fetches `/api/coach/today`

**Data:** one call to `GET /api/coach/today` on mount.

### League Detail (`/league/:id`)

**Goal:** Replace the bot's separate `/tables` and `/matches` flows with one screen.

**Layout:**
1. Header: back button + league icon + name
2. Tab switcher: **Table** | **Fixtures**
3. **Table tab:** broadcast-style standings — rank, team (with crest), played, GD, points. Top rows tinted green (UCL spots), bottom rows tinted red (relegation) where applicable.
4. **Fixtures tab:** stacked match cards — upcoming first, then recent results.

**Interactions:** Tap any match → Match Detail.

**Data:** one call to `GET /api/coach/competitions/:id`.

### Match Detail (`/match/:id`)

**Goal:** Surface rich match data that the bot currently can't show.

**Layout (top to bottom):**
1. **Scoreboard hero** — team crests, large score, status, minute (live), date (scheduled), league strip
2. **Events timeline** — chronological list, icons per event type, side-indicated (home left, away right)
3. **Lineups** — if formation present, render a simple positional sketch; else list players per side
4. **Stats** — horizontal bars (possession, shots, corners) with animated fill on mount

Each section renders only when its data is present. If everything except scoreboard is empty (typical for far-future fixtures), show a friendly "אין עדיין נתונים" placeholder.

**Data:** one call to `GET /api/coach/matches/:id`.

## Visual identity — Sportcaster broadcast

**Theme tokens (Tailwind config):**

```ts
const colors = {
  bg: {
    base: '#0A0E14',       // page background
    card: '#141A23',       // surface cards
    elevated: '#1B2330',   // hover/focus
  },
  border: { subtle: '#1F2937' },
  text: {
    primary: '#FFFFFF',
    secondary: '#94A3B8',
    muted: '#64748B',
  },
  accent: {
    live: '#FF3B3B',       // pulsing dot, live pill
    win:  '#00E676',       // wins, top of table
    draw: '#FFD600',       // draws, warnings
    loss: '#FF3B3B',       // losses, relegation
  },
};
```

**Typographic tokens:** condensed bold for scores (broadcast feel), regular sans for body. Use system font stack for now — defer custom font decision.

**Per-league color strip:** A 4px-wide left edge on every match card and league section header, tinted by league theme color (UCL `#0A2E72`, Premier League `#3D195B`, La Liga `#EE2737`, Ligat HaAl `#1E3A8A`, etc.). Color map lives in `apps/coach-web/src/lib/league-themes.ts`.

**Motion (framer-motion):**
- Home-card stagger on mount (50ms delay between cards)
- Live-dot pulse (1.4s ease-in-out infinite)
- Score-change flash (one-shot scale+glow on score updates)
- Tab transitions on League Detail (slide+fade)
- Stat bars: width-animate from 0 to value on mount

**RTL:** the mini app is Hebrew-first. `<html dir="rtl" lang="he">`, layout flips naturally (left-edge stripe becomes right-edge in RTL — keep it on the team's side, not literally "left"). Numerals stay LTR (scores, ranks, minutes).

## Bot integration

`src/features/coach/launcher.service.ts`:
- Reads the mini app URL from env (`COACH_WEB_APP_URL`)
- On the `/start` flow and inside `/actions`, adds an extra inline button: `{ text: '📱 פתח אפליקציה', web_app: { url } }`
- Mirrors the pattern in `src/features/stacker/launcher.service.ts`

No behavior change to existing commands — the mini app is purely additive.

## Non-functional notes

- **Performance:** today/competition responses are cheap (single API hit, ~50–200 matches typical). No pagination needed.
- **Caching:** lean on the existing scores-365 caches in `src/services/scores-365/`. The mini-app API does not add its own cache layer yet — add only if observed latency justifies it.
- **Errors:** API returns standard JSON `{ error: string }` with appropriate status codes. Frontend renders a friendly Hebrew empty/error state per screen.
- **Testing:** keep parity with stacker-api — unit-test the initData verifier; integration-test each route with a mocked scores-365 layer.
- **Telegram BackButton:** mount `Telegram.WebApp.BackButton` on League Detail and Match Detail; on Home, hide it (root screen).

## Open questions (deferred)

- Should the home dashboard auto-refresh on a timer while a live match is on screen? (Default: no, manual pull-to-refresh.)
- Should we eventually migrate `/actions` (settings) into the mini app as a settings page? (Not now; the bot's inline-button flow is fine for these low-frequency actions.)
- Custom font choice — defer until first visual review.

## Acceptance criteria

1. User opens the bot, sees a "📱 פתח אפליקציה" button, taps it; the mini app opens inside Telegram with their followed leagues' matches grouped on screen.
2. Tapping a live match card opens Match Detail with score, events, and stats (where API provides them).
3. Tapping a league section header opens League Detail with both Table and Fixtures tabs working.
4. All copy is Hebrew, layout is RTL, scores and numerals render LTR.
5. Invalid/missing `initData` returns 401 from every API endpoint.
6. The bot's existing `/start`, `/tables`, `/matches`, `/actions` commands continue to work unchanged.
