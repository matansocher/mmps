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
| `/actions` | Manage daily updates, custom leagues, contact, and mini-app access |

## Database

**Database name**: `Coach`

Collections:
- `User` - Telegram user details
- `Subscription` - Daily update settings and custom league selections

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
