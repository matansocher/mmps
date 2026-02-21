# Langly

**Language Learning Assistant** - Interactive language learning with daily challenges.

## Overview

Langly is a language learning bot that helps users improve their language skills through daily challenges, vocabulary building, and interactive exercises.

## Features

- 📚 **Daily Challenges** - New language exercises every day
- 📖 **Vocabulary Building** - Learn new words in context
- 🗣️ **Pronunciation** - Audio guides and pronunciation tips
- ✅ **Progress Tracking** - Track learning progress
- 🎯 **Personalized Learning** - Adapted to user level

## Configuration

### Environment Variables

```bash
# Required
LANGLY_TELEGRAM_BOT_TOKEN=your-token

# Optional
MONGO_URI=mongodb://...
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

### 2. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=langly npm run start:dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start learning |
| `/challenge` | Get today's challenge |
| `/vocabulary` | Learn new words |
| `/progress` | Check your progress |
| `/settings` | Configure learning preferences |

## Supported Languages

- 🇬🇧 English
- 🇪🇸 Spanish
- 🇫🇷 French
- 🇩🇪 German
- 🇮🇹 Italian
- 🇵🇹 Portuguese
- And more

## Database

**Database name**: `langly-db`

Collections:
- `users` - User profiles and level
- `challenges` - Language challenges
- `vocabulary` - Word database
- `user_progress` - User learning progress

## Scheduled Tasks

- **Daily Challenge** - 09:00 each day
- **Reminder** - 18:00 daily reminder to practice

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
