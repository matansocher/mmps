# Wolt

**Restaurant Notifications** - Monitors and notifies about restaurant availability.

## Overview

Wolt bot watches restaurants on the Wolt delivery platform and messages you when a restaurant that is currently closed or not taking orders comes back online.

## Supported Areas

Only these Wolt cities are tracked (`CITIES_SLUGS_SUPPORTED` in `wolt.config.ts`), each fetched from a single fixed city center:

- `tel-aviv` - TLV - Herzliya area
- `hasharon` - Hasharon area
- `petah-tikva` - Petah Tikva

A restaurant that Wolt doesn't list from those city centers can't be found. There is no per-user location.

## Features

- 🔎 **Search** - Send a restaurant name **in English**, or paste a Wolt restaurant link (links work even when shared with Hebrew text around them)
- 🔔 **Availability Alerts** - Get a message with a link as soon as the restaurant is online again
- ⏱️ **Alert Expiry** - Alerts expire after 4 hours, with buttons to extend them by 1 or 4 hours
- 📋 **Limits** - Up to 6 open alerts per user, one per restaurant branch
- 🌙 **Quiet Hours** - Expiry messages between 01:00 and 08:00 are sent silently

## Configuration

### Environment Variables

```bash
# Required
WOLT_TELEGRAM_BOT_TOKEN=your-token
MONGO_DB_URL=mongodb://...

# Optional
WOLT_RELAY_URL=https://script.google.com/macros/s/.../exec   # relay for the restaurants endpoint
OPENAI_API_KEY=sk-...                                          # ranks search results; falls back to word matching
NOTIFIER_TELEGRAM_BOT_TOKEN=your-token                         # admin notifications (subscriptions, failures)
```

### Restaurants Relay

Wolt rate-limits shared cloud IPs (e.g. Heroku dynos) on the restaurants endpoint, which shows up as immediate 429s. When `WOLT_RELAY_URL` is set, the bot fetches each city through that relay instead, appending `?lat=&lon=`. A free Google Apps Script web app works as a relay:

```javascript
function doGet(e) {
  const url = 'https://restaurant-api.wolt.com/v1/pages/restaurants?lat=' + e.parameter.lat + '&lon=' + e.parameter.lon;
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'app-language': 'en' } });
  return ContentService.createTextOutput(res.getContentText()).setMimeType(ContentService.MimeType.JSON);
}
```

If a city fails (an error, a timeout, or a response with no restaurants), its restaurants from the previous refresh are kept.

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

- **Availability Check** - Refreshes the restaurants list every 30 seconds at peak hours (11:00-16:00, 18:00-24:00), every minute or two at other times, and every 15 minutes between 04:00 and 11:00
- **Expired Subscription Cleanup** - Archives subscriptions once they expire (4 hours by default) and offers buttons to extend them by 1 or 4 hours

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
