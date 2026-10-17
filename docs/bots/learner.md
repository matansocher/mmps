# Learner

**Daily Learning Bites** - Turns study guides into short daily lessons with spaced-repetition reviews.

## Overview

Learner bot delivers bite-sized lessons from two study guides — **System Design** and **AI Engineering** — once a day on Telegram. Each bite is rated, and the rating schedules the next review. A companion mini-app (`apps/learner-web`) lets you browse and study the full curriculum, with progress synced to the bot.

## Features

- 📚 **Daily Bite** - One reminder a day with the next bite to study (due reviews first, then new bites, then ones still being learned, in curriculum order)
- 👋 **Instant First Bite** - `/start` subscribes you and sends the first bite right away, without using up the daily reminder
- 💪 **Ratings** - Each bite has **Got it** / **Fuzzy** / **Nope** buttons. Reviews are spaced SM-2-lite style: Nope → 1 day, Fuzzy → 3 days, Got it → 7 days, growing ×2.2 with each consecutive Got it
- 🚀 **Mini App** - `/app` opens the Learner web app, served at `/learner/*`
- 🔄 **Progress Sync** - The bot and the mini-app share progress through `/api/learner/progress`, authenticated with Telegram WebApp `initData` (an `X-Learner-Dev-User` header is accepted outside production)
- 🛑 **Opt-out** - `/stop` turns off the daily reminders; the app stays available

## Configuration

### Environment Variables

```bash
# Required
LEARNER_TELEGRAM_BOT_TOKEN=your-token
MONGO_DB_URL=mongodb://...

# Optional
NOTIFIER_TELEGRAM_BOT_TOKEN=your-token   # admin notifications (starts, ratings, failures)
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

### 2. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=LEARNER npm run dev
```

To work on the mini-app, run `npm run dev:learner-web` (it proxies `/api/learner` to `http://localhost:3000`).

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Subscribe to daily reminders and get the first bite |
| `/today` | Get today's bite |
| `/app` | Open the mini-app |
| `/stop` | Stop daily reminders |

## Database

**Database name**: `Learner`

Collections:
- `Progress` - Per-user bite states, streak and last study date
- `Subscriptions` - Reminder subscriptions per chat
- `Deliveries` - Bites sent per day and slot (expire after 14 days)

## Scheduled Tasks

- **Daily Reminder** - 11:15 (Asia/Jerusalem): sends each active subscriber their next bite. Delivery is idempotent per day, so it never sends duplicates.

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
