# Israel Geo

**Street View Geography Game** - Explore an Israeli street, draw a confidence circle, and build personal mastery.

## Overview

Israel Geo is a Telegram Mini App with five-round normal games and one shared Daily Route. The browser renders Google Street View and maps, while the server validates Telegram identity, scores guesses, and persists all progression.

## Features

- 🧭 **Confidence Circles** - Smaller successful circles earn stronger scores and precision rewards
- 📅 **Daily Route** - The same five locations for every player, with one rewarded attempt and unlimited reward-free practice
- 📕 **Israel Passport** - Collect stamps and improve the best successful radius for 18 locality groups
- 👑 **City Crowns** - Permanent Bronze, Silver, Gold, and Crown mastery tiers
- 🗺️ **Light Up Israel** - Personal monthly progress from successful Daily Route locations
- 🎨 **Rewards Shop** - Cosmetic Passport covers, maps, pins, and share-card frames
- 🧑‍✈️ **Navigator Identity** - Editable name, illustrated avatar, XP, levels, titles, badges, and private profile sharing

## Configuration

```bash
ISRAEL_GEO_TELEGRAM_BOT_TOKEN=your-token
ISRAEL_GEO_MINI_APP_URL=https://example.com/israel-geo/
GOOGLE_MAPS_API_KEY=your-server-key
VITE_GOOGLE_MAPS_API_KEY=your-browser-key
MONGO_DB_URL=mongodb://...
```

The browser key requires the Google Maps JavaScript API and should be restricted by HTTP referrer. The server key is used by Street View metadata requests.

## Getting Started

```bash
LOCAL_ACTIVE_BOT_ID=ISRAEL_GEO npm run dev
```

Local API authentication uses `MY_USER_ID`. Production validates signed Telegram Mini App init data against the dedicated bot token.

## Commands

| Command  | Description                  |
| -------- | ---------------------------- |
| `/start` | Open the Israel Geo Mini App |

## Database

**Database name**: `IsraelGeo`

Collections:

- `players` - Identity, Passport, coins, cosmetics, XP, Crowns, streaks, records, and monthly progress
- `dailyRoutes` - The five shared locations for each Israel date
- `dailyAttempts` - Completed first attempts used for retention and cleanup

## Scheduled Tasks

None. Daily Routes are created lazily once per Israel date and stored with a unique index.

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
