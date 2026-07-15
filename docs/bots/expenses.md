# Expenses

**Expense Tracker** - Telegram launcher and Vite mini-app for importing, browsing, and editing expenses.

## Overview

Expenses combines a Telegram bot with the `apps/expenses-web` mini-app. The bot opens the tracker and imports supported credit-card `.xlsx` statements; the API serves monthly totals, search, vendor/category details, subscriptions, card lists, manual entries, and user overrides.

## Features

- 💸 **Mini-App Launcher** - `/start` opens the expenses web app from Telegram
- 📥 **Statement Import** - Imports supported `.xlsx` card statements from Telegram documents
- 📊 **Monthly Dashboard API** - Totals by category, type, currency, and month
- 🔎 **Search & Drilldown** - Search expenses and inspect vendors or categories
- ✍️ **Manual Entries** - Create and edit expenses from the mini-app
- 🧠 **AI Categorization** - Shared import/manual-entry logic can categorize expenses with AI

## Configuration

### Environment Variables

```bash
# Required
EXPENSES_TELEGRAM_BOT_TOKEN=your-token
EXPENSES_MINI_APP_URL=https://your-public-url/expenses/
MONGO_DB_URL=mongodb://...

# Optional for AI-assisted categorization
OPENAI_API_KEY=sk-...
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

### 2. Build or Run the Mini-App

The SPA lives in `apps/expenses-web` and is served by the backend at `/expenses/*` in production builds.

### 3. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=EXPENSES npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Opens the expenses mini-app |

The bot also handles Telegram document messages and imports supported `.xlsx` statements.

## Database

**Database name**: `Expenses`

Collections:
- `Expenses` - Imported and manually created expenses
- `IngestExpenses` - Import ingestion records used to dedupe statement rows

## Scheduled Tasks

Expenses does not register scheduled tasks.

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
