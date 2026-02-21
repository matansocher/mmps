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
MONGO_URI=mongodb://...
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

### 2. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=wolt npm run start:dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Setup location |
| `/add [restaurant]` | Add favorite restaurant |
| `/favorites` | View favorite restaurants |
| `/available` | Check availability now |
| `/settings` | Configure notifications |

## Database

**Database name**: `wolt-db`

Collections:
- `users` - User locations and preferences
- `favorites` - Favorite restaurants
- `availability` - Current availability cache

## Scheduled Tasks

- **Availability Check** - Every 5 minutes
- **Notification Sending** - Real-time when availability changes

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
