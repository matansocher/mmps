# Bots Overview

MMPS includes 9 specialized Telegram bots plus one bot-less web feature. Each bot lives in `src/features/{name}/` and is initialized only when `IS_PROD=true` or `LOCAL_ACTIVE_BOT_ID` matches its uppercase ID. Clutch is always initialized.

## The Bots

### 1. **Chatbot** - AI-Powered Assistant
The main conversational assistant with LangGraph, Mongo-backed memory, and many tools.
- **Features**: Weather, reminders, calendar, Gmail, sports, recipes, GitHub, media tools, and usage metering
- **Database**: `Chatbot` for checkpoints/usage plus shared feature databases
- **[Learn more →](/bots/chatbot)**

### 2. **Chilli** - Hebrew Cat Persona
A playful Hebrew persona bot that replies as the user's cat.
- **Features**: Mongo-backed persona prompt, owner-only prompt updates, OpenAI mini model
- **Database**: `Chilli`
- **[Learn more →](/bots/chilli)**

### 3. **Coach** - Sports Analytics & Predictions
Real-time sports data with match summaries, standings, and daily updates.
- **Features**: Match summaries, competition tables, custom league subscriptions, mini-app launcher
- **Database**: `Coach`
- **[Learn more →](/bots/coach)**

### 4. **Expenses** - Expense Tracker
Telegram document importer and mini-app for browsing and editing expenses.
- **Features**: XLSX imports, monthly dashboard API, search, manual entries, vendor/category overrides
- **Database**: `Expenses`
- **[Learn more →](/bots/expenses)**

### 5. **Israel Geo** - Street View Geography Game
Telegram Mini App for confidence-circle guessing and personal Israel mastery.
- **Features**: Daily Route, Passport, City Crowns, Navigator XP, monthly map, cosmetics
- **Database**: `IsraelGeo`
- **[Learn more →](/bots/israel-geo)**

### 6. **Learner** - Courses Mini-App
Telegram launcher and progress API for AI engineering courses.
- **Features**: `/learner/` SPA, progress tracking, mini-app analytics
- **Database**: `Learner`
- **[Learn more →](/bots/learner)**

### 7. **Secretary** - Telegram Business Assistant
Personal secretary for Telegram business conversations.
- **Features**: Voice transcription, draft replies, daily summaries, one-tap actions, check-in nudges
- **Database**: `Secretary`
- **[Learn more →](/bots/secretary)**

### 8. **Wolt** - Restaurant Notifications
Watches Wolt restaurants and notifies when tracked restaurants open.
- **Features**: Restaurant search, subscriptions, availability alerts, expiry cleanup
- **Database**: `Wolt`
- **[Learn more →](/bots/wolt)**

### 9. **Worldly** - Geography Education
Interactive geography quiz bot.
- **Features**: Map, US map, flag, capital, random games, fire mode, daily quizzes
- **Database**: `Worldly`
- **[Learn more →](/bots/worldly)**

### **Clutch** - Bot-Less Web Feature
Static SPA served at `/clutch/*` with analytics forwarded to the Telegram notifier.
- **Features**: `apps/clutch-web`, `POST /clutch/api/events`, always initialized
- **Database**: None
- **[Learn more →](/bots/clutch)**

## Running Bots

### Development Mode (One Bot)

```bash
LOCAL_ACTIVE_BOT_ID=CHATBOT npm run dev
```

Replace `CHATBOT` with one of: `CHILLI`, `COACH`, `EXPENSES`, `ISRAEL_GEO`, `LEARNER`, `SECRETARY`, `WOLT`, `WORLDLY`.

### Production Mode (All Bots)

```bash
IS_PROD=true npm start
```

Production initializes all 9 Telegram bots. Clutch initializes in both development and production.

## Bot Architecture

Most bots follow this shape:

```
features/{bot}/
├── {bot}.init.ts              # Initialization
├── {bot}.controller.ts        # Telegram handlers
├── {bot}.service.ts           # Business logic
├── {bot}-scheduler.service.ts # Scheduled tasks when needed
├── {bot}.config.ts            # Configuration
└── types.ts                   # Type definitions
```

Mini-app bots also register Express routes and serve their SPA from `apps/{name}-web/dist`.

## Configuration

Each Telegram bot has a `BOT_CONFIG` in its config file:

```typescript
export const BOT_CONFIG = {
  id: 'CHATBOT',
  name: 'Chatbot',
  token: 'CHATBOT_TELEGRAM_BOT_TOKEN',
};
```

## Database Isolation

MongoDB uses the shared connection string:

```bash
MONGO_DB_URL=mongodb://...
```

Current bot databases:
- `Chatbot` - Chatbot LangGraph checkpoints and token/cost usage records
- `Chilli` - Chilli prompt versions
- `Coach` - Coach users and subscriptions
- `Expenses` - Expense and ingest records
- `IsraelGeo` - Player progression, shared Daily Routes, and completed Daily attempts
- `Learner` - Course progress
- `Secretary` - Messages, actions, drafts, and nudges
- `Wolt` - Wolt users and subscriptions
- `Worldly` - Geography content, subscriptions, and game logs

Chatbot also connects to several shared feature databases (`Reminders`, `CalendarEvents`, `Trainer`, `Wolt`, `Worldly`, `Coach`, and others) because its AI tools read and write those domains.

## Environment Variables

```bash
# Required for persistence
MONGO_DB_URL=mongodb://...

# Bot tokens
CHATBOT_TELEGRAM_BOT_TOKEN=...
CHILLI_TELEGRAM_BOT_TOKEN=...
COACH_TELEGRAM_BOT_TOKEN=...
EXPENSES_TELEGRAM_BOT_TOKEN=...
ISRAEL_GEO_TELEGRAM_BOT_TOKEN=...
LEARNER_TELEGRAM_BOT_TOKEN=...
SECRETARY_TELEGRAM_BOT_TOKEN=...
WOLT_TELEGRAM_BOT_TOKEN=...
WORLDLY_TELEGRAM_BOT_TOKEN=...

# Bot-less Clutch analytics
NOTIFIER_TELEGRAM_BOT_TOKEN=...
```

## Next Steps

Select a bot to explore:
- **[Chatbot](/bots/chatbot)** - AI assistant with tools
- **[Chilli](/bots/chilli)** - Hebrew cat persona
- **[Coach](/bots/coach)** - Sports analytics
- **[Expenses](/bots/expenses)** - Expense tracker
- **[Israel Geo](/bots/israel-geo)** - Street View geography game
- **[Learner](/bots/learner)** - Courses mini-app
- **[Secretary](/bots/secretary)** - Telegram business assistant
- **[Wolt](/bots/wolt)** - Restaurant alerts
- **[Worldly](/bots/worldly)** - Geography education
- **[Clutch](/bots/clutch)** - Bot-less static SPA

Or explore:
- **[Architecture](/architecture/overview)** - System design
- **[Development](/development/contributing)** - Contributing
- **[Deployment](/deployment/production)** - Production setup
