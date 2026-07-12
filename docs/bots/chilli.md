# Chilli

**Hebrew Cat Persona** - Replies as the user's cat, Chilli, with a playful Hebrew personality.

## Overview

Chilli is a small persona bot built on the shared chatbot agent stack. It loads the latest persona prompt from MongoDB and replies in Hebrew as Chilli the cat, with per-user context for the owner and Toodie.

## Features

- 🐱 **Cat Persona** - Answers as Chilli with a Hebrew cat voice
- 🧠 **Mongo-Backed Prompt** - Uses the latest prompt version stored in MongoDB
- ✍️ **Prompt Updates** - Owner-only `/update` command merges new facts into the stored prompt
- 🤖 **Mini Model** - Uses OpenAI's mini chat model through `createAgentService`
- 💰 **Usage Tracking** - Records token and cost usage under the `chilli` source

## Configuration

### Environment Variables

```bash
# Required
CHILLI_TELEGRAM_BOT_TOKEN=your-token
OPENAI_API_KEY=sk-...
MONGO_DB_URL=mongodb://...
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

### 2. Seed a Prompt

Chilli expects at least one prompt document in MongoDB. The bot reads the newest document from the `Prompt` collection.

### 3. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=CHILLI npm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/update <text>` | Owner-only prompt update that stores a new prompt version |

Regular text messages are sent to the Chilli persona agent and answered in chat.

## Database

**Database name**: `Chilli`

Collections:
- `Prompt` - Versioned persona prompts, newest document wins

## Scheduled Tasks

Chilli does not register scheduled tasks.

## Next Steps

- [Bot Overview](/bots/overview)
- [Chatbot](/bots/chatbot)
- [Architecture](/architecture/overview)
