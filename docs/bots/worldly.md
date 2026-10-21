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

| Command      | Description                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `/start`     | Start daily geography games                                                                      |
| `/random`    | Start a random game                                                                              |
| `/fire_mode` | Play continuous games                                                                            |
| `/map`       | Guess a country from a map                                                                       |
| `/usmap`     | Guess a US state from a map                                                                      |
| `/flag`      | Guess a country from a flag                                                                      |
| `/capital`   | Guess the country by capital                                                                     |
| `/globe`     | Open the [Earth](./earth.md) globe quiz as a Telegram mini app                                   |
| `/logic`     | Today's [Earth Logic](./earth.md) puzzle: the first clue and a button that opens it in the globe |
| `/actions`   | Manage language, daily games, statistics, and contact                                            |

The `/start` reply also carries the globe button, which opens the mini app at `${MMPS_BASE_URL}/earth`. The chat menu button stays the commands list. `initWorldly` also serves the `apps/earth-web` build at `/earth/*`, so the globe is only available when the Worldly bot boots (prod, or `LOCAL_ACTIVE_BOT_ID=WORLDLY` locally).

## Language

English is the default for all users, including existing users without a saved preference. Open `/actions`, select **Language / שפה**, and choose **English** or **עברית**. The selection is saved in the `User` document and survives restarts; `/start` does not reset it.

The selected language applies to bot replies, action buttons, the chat command menu, country/state/capital quiz options, answer feedback, statistics, and scheduled games and Earth Logic teasers. Existing quiz buttons still work after changing language; answer feedback uses the current selection. `/start` explains where to change the language and manage daily games. The separate Earth mini app is unchanged.

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

- `User` - Telegram user details and optional `language` (`en` or `he`; missing values use English)
- `Subscription` - Daily game subscription settings
- `Country` - Country quiz data
- `State` - US state quiz data
- `GameLog` - Per-user quiz answers and results
- `GlobeProgress` - Per-user [Earth](/bots/earth) mini-app progress

## Scheduled Tasks

- **Daily Earth Logic teaser** - 09:00 in the project timezone: today's first clue and a button to solve it in the globe, sent to active subscribers
- **Daily Games** - 12:00, 17:00, and 20:00 in the project timezone for active subscribers

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
