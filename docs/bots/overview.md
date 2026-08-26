# Bots Overview

MMPS includes 7 specialized Telegram bots plus a bot-less web features. Each bot lives in `src/features/{name}/` and is initialized only when `IS_PROD=true` or `LOCAL_ACTIVE_BOT_ID` matches its uppercase ID. Savings is initialized independently of bot selection.

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

### 5. **Wolt** - Restaurant Notifications
Watches Wolt restaurants and notifies when tracked restaurants open.
- **Features**: Restaurant search, subscriptions, availability alerts, expiry cleanup
- **Database**: `Wolt`
- **[Learn more →](/bots/wolt)**

### 6. **Worldly** - Geography Education
Interactive geography quiz bot.
- **Features**: Map, US map, flag, capital, random games, fire mode, daily quizzes
- **Database**: `Worldly`
- **[Learn more →](/bots/worldly)**

### **Savings** - Shared Portfolio Rebalancer
Password-protected React application served at `/savings/*` for managing one shared family portfolio with real ILS values.
- **Features**: Reactive rebalancing, explicit saves, revision conflict protection, shared-password authentication
- **Database**: `Savings`
- **[Learn more →](/bots/savings)**

## Running Bots

### Development Mode (One Bot)

```bash
LOCAL_ACTIVE_BOT_ID=CHATBOT npm run dev
```

Replace `CHATBOT` with one of: `CHILLI`, `COACH`, `EXPENSES`, `WOLT`, `WORLDLY`.

### Production Mode (All Bots)

```bash
IS_PROD=true npm start
```

Production initializes all 7 Telegram bots. Savings initialize in development and production.

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
- `Savings` - Shared portfolio settings and holdings
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
WOLT_TELEGRAM_BOT_TOKEN=...
WORLDLY_TELEGRAM_BOT_TOKEN=...

NOTIFIER_TELEGRAM_BOT_TOKEN=...

# Bot-less Savings app
SAVINGS_APP_PASSWORD=...
```

## Next Steps

Select a bot to explore:
- **[Chatbot](/bots/chatbot)** - AI assistant with tools
- **[Chilli](/bots/chilli)** - Hebrew cat persona
- **[Coach](/bots/coach)** - Sports analytics
- **[Expenses](/bots/expenses)** - Expense tracker
- **[Wolt](/bots/wolt)** - Restaurant alerts
- **[Worldly](/bots/worldly)** - Geography education
- **[Savings](/bots/savings)** - Shared portfolio rebalancer

Or explore:
- **[Architecture](/architecture/overview)** - System design
- **[Development](/development/contributing)** - Contributing
- **[Deployment](/deployment/production)** - Production setup
