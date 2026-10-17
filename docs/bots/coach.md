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

- **What it shows** - Today's games from the selected leagues plus favorite teams (pinned on top even if their league isn't selected), ordered live → upcoming → finished. Live games include xG, shots on target and possession. A unified feed lists the latest events across all games.
- **Views** - Cards grid (default on desktop) or a compact list (default on mobile); the feed is a side column on desktop and a tab on mobile.
- **Refresh** - Every 30 seconds while the page is visible.
- **Settings** - Leagues, favorite teams (search), and which event types appear (default: goals, red cards, missed penalties, VAR; yellow cards, woodwork and substitutions optional). Stored per user.
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
SCORES_365_API_KEY=your-api-key

# Optional
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
- `DashboardPreferences` - Live dashboard leagues, favorite teams, event types and browser access token

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
