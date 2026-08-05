# Wolt

**Restaurant Notifications** - Monitors and notifies about restaurant availability.

## Overview

Wolt bot monitors restaurant availability on the Wolt delivery platform and sends notifications when your favorite restaurants are available in your area.

## Features

- 📍 **Location-Based** - Get notifications for your area
- 🍽️ **Restaurant Favorites** - Add and track favorite restaurants
- 🔔 **Push Notifications** - Get notified when restaurants are available
- ⏱️ **Availability Tracking** - Real-time availability updates
- 📱 **Quick Ordering** - Direct links to Wolt

## Configuration

### Environment Variables

```bash
# Required
WOLT_TELEGRAM_BOT_TOKEN=your-token

# Optional
MONGO_DB_URL=mongodb://...
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

### 2. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=WOLT npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and save user details |
| `/list` | View open restaurant alerts |
| `/contact` | Show the contact message |

## Database

**Database name**: `Wolt`

Collections:
- `User` - Telegram user details
- `Subscription` - Active and archived restaurant availability alerts

## Scheduled Tasks

- **Availability Check** - Adaptive interval based on time of day
- **Expired Subscription Cleanup** - Archives subscriptions after the configured expiration window

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
