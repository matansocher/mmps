# Coach

**Sports Analytics & Predictions** - Real-time sports data with match analysis and predictions.

## Overview

Coach is a specialized bot for sports enthusiasts, providing real-time match updates, competition standings, and betting value analysis.

## Features

- 📊 **Match Summaries** - Today's matches with scores and predictions
- 🏆 **Competition Tables** - Current standings and statistics
- 💰 **Betting Analysis** - Value analysis for betting decisions
- ⏲️ **Live Updates** - Real-time match information
- 📱 **Quick Access** - Fast, easy-to-read formats
- 📺 **Live Dashboard** - Mini-app showing every game of your leagues and favorite teams on one screen

## Live Dashboard

A 365Scores-style mini-app (`apps/coach-web`) served at `/coach`, backed by `/api/coach/*`.

- **What it shows** - Today's games from the selected leagues plus favorite teams (shown even if their league isn't selected), ordered live → upcoming → finished, with favorite teams first in each section. Cards are equal height and show the live minute, scorers plus red cards / missed penalties / VAR under each team (up to 3 scorers, then "+N more"), a match timeline on live cards (played minutes in green, home events above and away events below), each team's last 5 results plus a kick-off countdown on upcoming cards, and the TV channels (official Sport 5 / Sport 1 / ONE logos, otherwise from 365; the name is shown when there is no logo). League logos appear on cards, filters, settings and league pages.
- **Filters** - Chips at the top filter by league, plus a "My teams" chip (shown when a favorite team plays today) that shows only those games.
- **Finished games** - Grouped by league (leagues with a favorite team first), each league sorted by kick-off. When possible, a finished game shows one line on what it changed, computed from the live table: going top or losing first place, moving into or out of a qualification / relegation zone, a climb of 2+ places, a team going through in a knockout tie, and a mathematical title or relegation (Premier League, LaLiga, Serie A, Bundesliga only). The line appears once 365's table includes the result.
- **Views** - Cards grid (default on desktop) or a compact list (default on mobile). In the list view, the live minute sits under the score.
- **Language** - Hebrew (RTL) by default, with English available in Settings. 365Scores data (team, player and competition names) is fetched in the chosen language, and the choice is saved with your preferences.
- **Notifications** - On every refresh, new events (per the selected event types), confirmed lineups, kick-offs and full-times pop up as notification cards (top corner on desktop, top on mobile). They stay until the next refresh; tapping one opens the game. Titles describe what the event means for the game ("Equaliser!", "Comeback! Arsenal lead", "Chelsea down to 10", "Chelsea miss a penalty · still 1-1", braces/hat-tricks); this is computed by replaying the goals, and falls back to a plain title when the visible events don't add up to the score.
- **Game page** - Scoreboard, info (competition, round, kick-off, TV, venue, referee), events timeline, stats, form (last 5 per team), head-to-head record and recent meetings, lineups on a pitch with ratings plus bench/missing players, and the league table. Before kick-off, form and head-to-head replace the empty timeline and stats.
- **Team & player pages** - Team: form, upcoming/recent matches and squad. Player: details, season stats per competition and recent games.
- **Leagues tab** - Per-league page with today's games, the table (or groups) and the knockout bracket when there is one. While games are in play the table is live: it includes those games, shows ▲/▼ for position changes and a live score chip per team, and refreshes at the dashboard interval.
- **Refresh** - Configurable in Settings (15s-2min, default 30s) while the page is visible. 365Scores publishes no rate limit; the API caches live data for 15s, so 15s is the minimum.
- **Settings** - Leagues, favorite teams (search, plus the list of current favorites with a remove button), notification event types (default: goals, red cards, missed penalties, VAR; yellow cards, woodwork and substitutions optional; these only affect notifications, not the cards) and refresh interval. Stored per user.
- **Access** - `/dashboard` sends a mini-app button (authenticated with Telegram init data) and a private browser link (`/coach/?t=<token>`) for opening it on a computer.

Local development:

```bash
LOCAL_ACTIVE_BOT_ID=COACH npm run dev   # API on PORT (default 3000)
npm run dev:coach-web                    # Vite; COACH_WEB_PORT (default 5174), COACH_API_URL (default http://localhost:3000)
```

Without Telegram, the API falls back to the `MY_USER_ID` user when `NODE_ENV` isn't `production`.

## Configuration

### Environment Variables

```bash
# Required
COACH_TELEGRAM_BOT_TOKEN=your-token
MONGO_DB_URL=mongodb://...
```

## Getting Started

### 1. Get API Keys

**Telegram Bot Token:**
- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

**Scores365 API:**
- Sign up at [scores365.com](https://scores365.com)
- Get your API key

### 2. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=COACH npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot |
| `/matches` | Choose a competition and view matches |
| `/tables` | Choose a competition and view its table |
| `/dashboard` | Open the live games dashboard (mini-app + private browser link) |
| `/actions` | Manage daily updates, custom leagues, contact, and mini-app access |

## Database

**Database name**: `Coach`

Collections:
- `User` - Telegram user details
- `Subscription` - Daily update settings and custom league selections
- `DashboardPreferences` - Live dashboard leagues, favorite teams, event types, refresh interval and browser access token

## Scheduled Tasks

- **Daily Match Summaries** - 12:59 and 23:59 in the project timezone for active subscribers

## Sports Covered

- ⚽ Football (Soccer)
- 🏀 Basketball
- 🏈 American Football
- ⚾ Baseball
- 🏒 Hockey
- And more via Scores365 API

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
