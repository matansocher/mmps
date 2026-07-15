# Worldly

**Geography Education** - Geography teaching and trivia challenges.

## Overview

Worldly is an educational bot that teaches geography through interactive quizzes, trivia challenges, and location-based learning.

## Features

- 🌍 **Geography Trivia** - Test your geography knowledge
- 📍 **Location Challenges** - Identify places and landmarks
- 🗺️ **Interactive Maps** - Learn with visual geography
- 🏆 **Leaderboards** - Compete with other users
- 🎓 **Learning Paths** - Structured learning curriculum

## Configuration

### Environment Variables

```bash
# Required
WORLDLY_TELEGRAM_BOT_TOKEN=your-token

# Optional
MONGO_DB_URL=mongodb://...
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

### 2. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=WORLDLY npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start daily geography games |
| `/random` | Start a random game |
| `/fire_mode` | Play continuous games |
| `/map` | Guess a country from a map |
| `/usmap` | Guess a US state from a map |
| `/flag` | Guess a country from a flag |
| `/capital` | Guess the country by capital |
| `/actions` | Manage daily games, statistics, and contact |

## Quiz Categories

- 🌍 Continents & Countries
- 🏙️ Cities & Capitals
- 🗻 Mountains & Geographic Features
- 🏖️ Rivers & Lakes
- 🏝️ Islands & Territories
- 🌐 Geography Facts

## Database

**Database name**: `Worldly`

Collections:
- `User` - Telegram user details
- `Subscription` - Daily game subscription settings
- `Country` - Country quiz data
- `State` - US state quiz data
- `GameLog` - Per-user quiz answers and results

## Scheduled Tasks

- **Daily Games** - 12:00, 17:00, and 20:00 in the project timezone for active subscribers

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
