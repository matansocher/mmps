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
MONGO_URI=mongodb://...
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

### 2. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=worldly npm run start:dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start learning |
| `/quiz` | Take a geography quiz |
| `/challenge` | Daily geography challenge |
| `/leaderboard` | View top scores |
| `/stats` | Your statistics |

## Quiz Categories

- 🌍 Continents & Countries
- 🏙️ Cities & Capitals
- 🗻 Mountains & Geographic Features
- 🏖️ Rivers & Lakes
- 🏝️ Islands & Territories
- 🌐 Geography Facts

## Database

**Database name**: `worldly-db`

Collections:
- `users` - User profiles
- `quizzes` - Quiz questions
- `scores` - User scores and stats
- `leaderboard` - Global rankings

## Scheduled Tasks

- **Daily Challenge** - 12:00 UTC
- **Leaderboard Update** - Daily at 23:59

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
