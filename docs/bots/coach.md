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

## Configuration

### Environment Variables

```bash
# Required
COACH_TELEGRAM_BOT_TOKEN=your-token
SCORES_365_API_KEY=your-api-key

# Optional
MONGO_URI=mongodb://...
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
LOCAL_ACTIVE_BOT_ID=coach npm run start:dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot |
| `/matches` | Today's matches |
| `/standings [competition_id]` | League table |
| `/predict [match_id]` | Match prediction |

## Database

**Database name**: `coach-db`

Collections:
- `matches` - Match data
- `competitions` - Competition information
- `user_preferences` - User favorite teams/competitions

## Scheduled Tasks

- **Match Updates** - Every 10 minutes during match day
- **Daily Summary** - 23:59 daily update

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
