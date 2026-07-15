# Learner

**Courses Mini-App** - Telegram launcher and progress API for AI engineering courses.

## Overview

Learner is a Telegram bot plus Vite mini-app served from `apps/learner-web` at `/learner/`. The bot opens the courses app, while the API records lesson progress and forwards mini-app analytics events to the Telegram notifier.

## Features

- 🎓 **Course Launcher** - `/start` opens the Learner mini-app
- 📚 **Static SPA** - Serves the built courses app at `/learner/*`
- ✅ **Progress Tracking** - Saves completed lesson IDs per course
- 📣 **Analytics Events** - Notifies on app open, lesson completion, and course completion
- 🔐 **Telegram Init Data Auth** - Protects `/api/learner/*` routes with Telegram mini-app auth

## Configuration

### Environment Variables

```bash
# Required
LEARNER_TELEGRAM_BOT_TOKEN=your-token
LEARNER_MINI_APP_URL=https://your-public-url/learner/
MONGO_DB_URL=mongodb://...
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

### 2. Build or Run the Mini-App

The SPA lives in `apps/learner-web` and is served by the backend at `/learner/*` in production builds.

### 3. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=LEARNER npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Opens the Learner mini-app |

## API Routes

- `POST /api/learner/events` - Track mini-app events
- `GET /api/learner/progress` - Read course progress for the Telegram user
- `PUT /api/learner/progress/:courseId` - Save completed lessons for a course

## Database

**Database name**: `Learner`

Collections:
- `Progress` - Course progress keyed by Telegram chat/user

## Scheduled Tasks

Learner does not register scheduled tasks.

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
