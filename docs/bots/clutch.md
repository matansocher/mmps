# Clutch

**Static SPA + Analytics** - Bot-less web feature served by the Express app.

## Overview

Clutch is not a Telegram bot. It is a static SPA from `apps/clutch-web` served at `/clutch/*`, with a lightweight analytics endpoint that forwards allowed front-end events to the Telegram notifier. Unlike bots, it is always initialized when the server starts.

## Features

- 🕹️ **Static Web App** - Serves the built Clutch SPA from `apps/clutch-web/dist`
- 📍 **Dedicated Route** - Handles `/clutch/*` with SPA fallback to `index.html`
- 📣 **Analytics Forwarding** - Accepts front-end events at `POST /clutch/api/events`
- ⚡ **Non-Blocking Events** - Responds immediately with `204` before forwarding notifications
- 🔔 **Notifier Integration** - Uses `NOTIFIER_TELEGRAM_BOT_TOKEN` through the shared notifier service

## Configuration

### Environment Variables

```bash
# Required for analytics notifications
NOTIFIER_TELEGRAM_BOT_TOKEN=your-token
```

Clutch does not have its own Telegram bot token and does not use `LOCAL_ACTIVE_BOT_ID`.

## Getting Started

### 1. Build or Run the SPA

The app lives in `apps/clutch-web` and is served by the backend at `/clutch/*` in production builds.

### 2. Run the Server

```bash
npm run dev
```

Clutch is initialized unconditionally by `initClutch(app)`.

## API Routes

- `POST /clutch/api/events` - Accepts allowed analytics events and forwards them to the notifier
- `GET /clutch/*` - Serves the Clutch SPA fallback

## Database

Clutch does not use MongoDB.

## Scheduled Tasks

Clutch does not register scheduled tasks.

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
