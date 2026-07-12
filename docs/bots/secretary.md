# Secretary

**Telegram Business Assistant** - Personal secretary for voice transcription, smart replies, summaries, and follow-up nudges.

## Overview

Secretary runs over a Telegram business connection. It stores business-chat messages, transcribes voice/audio notes, drafts reply options after unanswered messages, sends daily summaries to the owner, and turns extracted calendar/reminder suggestions into one-tap action buttons.

## Features

- 🤝 **Business Connection** - Listens to `business_connection` and `business_message` updates
- 🎙️ **Voice Transcription** - Transcribes voice/audio in business chats and direct messages
- 💬 **Draft Replies** - Suggests multiple owner-style reply options after a short idle period
- 🗒️ **Daily Summaries** - Sends end-of-day chat summaries with extracted actions
- ✅ **One-Tap Actions** - Executes calendar/reminder actions from summary buttons
- ⏰ **Reply Nudges** - Reminds the owner after an unanswered message remains open for an hour

## Configuration

### Environment Variables

```bash
# Required
SECRETARY_TELEGRAM_BOT_TOKEN=your-token
OPENAI_API_KEY=sk-...
MONGO_DB_URL=mongodb://...

# Optional
OWNER_BUSINESS_CONNECTION_ID=business-connection-id
SECRETARY_DRAFT_OPTIONS=4
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token
- Enable and connect the bot to Telegram Business where needed

### 2. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=SECRETARY npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/summary` | Owner-only command that builds and sends today's summaries immediately |

Secretary also handles business messages, callback buttons, and direct voice/audio messages.

## Database

**Database name**: `Secretary`

Collections:
- `Messages` - Stored business-chat messages for summaries and draft context
- `Actions` - Calendar/reminder actions extracted from summaries
- `Drafts` - Pending and sent smart-reply drafts
- `Nudges` - Forgotten-reply nudge records

## Scheduled Tasks

- **Daily Digest** - 23:30 daily in the project timezone
- **Check-In Prompt** - 11:13 on Monday, Tuesday, and Wednesday when no conversation happened that day

## Evaluation Scripts

- `npm run eval:build` - Build the draft-evaluation dataset
- `npm run eval:draft` - Run draft prompt evaluation

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
