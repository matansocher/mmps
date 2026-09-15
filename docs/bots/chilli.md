# Chilli

**Hebrew Cat Persona** - Replies as the user's cat, Chilli, with a playful Hebrew personality.

## Overview

Chilli is a small persona bot built on the shared chatbot agent stack. It uses a hardcoded persona prompt and replies in Hebrew as Chilli the cat, with per-user context for the owner and Toodie.

## Features

- 🐱 **Cat Persona** - Answers as Chilli with a Hebrew cat voice
- 🧠 **Hardcoded Prompt** - Persona prompt lives in `chilli.config.ts` (`CHILLI_PROMPT`)
- 🤖 **Mini Model** - Uses OpenAI's mini chat model through `createAgentService`
- 💰 **Usage Tracking** - Records token and cost usage under the `chilli` source

## Configuration

### Environment Variables

```bash
# Required
CHILLI_TELEGRAM_BOT_TOKEN=your-token
OPENAI_API_KEY=sk-...
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

### 2. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=CHILLI npm run dev
```

## Commands

Chilli has no commands. Regular text messages are sent to the Chilli persona agent and answered in chat.

## Database

Chilli does not use a database.

## Scheduled Tasks

Chilli does not register scheduled tasks.

## Next Steps

- [Bot Overview](/bots/overview)
- [Chatbot](/bots/chatbot)
- [Architecture](/architecture/overview)
