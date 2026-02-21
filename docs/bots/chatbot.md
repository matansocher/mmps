# Chatbot

**AI-Powered Conversational Assistant** - The flagship bot with advanced features and 20+ integrated tools.

## Overview

The Chatbot is MMPS's most advanced bot, powered by OpenAI's ChatGPT or Anthropic's Claude. It provides intelligent conversation with access to external tools like weather, reminders, calendar integration, GitHub, and more.

## Features

### Core Features
- **Conversational AI** - Natural language understanding and generation
- **Tool Integration** - 20+ tools for extending capabilities
- **Memory** - Conversation history with LangGraph MemorySaver
- **Error Handling** - Graceful degradation and fallbacks

### Available Tools
- 🌤️ **Weather** - Current conditions and forecasts
- ⏰ **Reminders** - Set and manage reminders
- 📅 **Calendar** - Calendar integration
- 🐙 **GitHub** - Repository and code interaction
- 📊 **Google Sheets** - Spreadsheet operations
- 🔍 **Web Search** - Search the internet
- ✅ **Todo Lists** - Task management
- And 13+ more tools

## Configuration

### Environment Variables

```bash
# Required
CHATBOT_TELEGRAM_BOT_TOKEN=your-token

# AI Model (choose one)
OPENAI_API_KEY=sk-...           # For ChatGPT
ANTHROPIC_API_KEY=sk-ant-...    # For Claude (alternative)

# Optional Tools
GITHUB_TOKEN=ghp_...            # For GitHub integration
WEATHERAPI_KEY=...              # For weather data
GOOGLE_SHEETS_CREDENTIALS=...   # For Sheets integration
```

### Bot Config

```typescript
export const BOT_CONFIG = {
  id: 'CHATBOT',
  name: 'Chatbot',
  token: 'CHATBOT_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start chatbot' },
    HELP: { command: '/help', description: 'Get help' },
    STATUS: { command: '/status', description: 'Check status' },
    CLEAR: { command: '/clear', description: 'Clear conversation' },
  },
};
```

## Getting Started

### 1. Create a Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow prompts
3. Copy the token to your `.env` file

### 2. Set Up AI Model

Choose either OpenAI or Anthropic:

**OpenAI:**
- Visit [platform.openai.com](https://platform.openai.com)
- Create an API key
- Add to `.env`: `OPENAI_API_KEY=sk-...`

**Anthropic (Claude):**
- Visit [console.anthropic.com](https://console.anthropic.com)
- Create an API key
- Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

### 3. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=chatbot npm run start:dev
```

### 4. Start Chatting

Open Telegram and search for your bot. Send `/start` to begin!

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot |
| `/help` | Get help and available commands |
| `/status` | Check bot status |
| `/clear` | Clear conversation history |

## Architecture

### Service Layer

```
ChatbotController (grammY handlers)
  ↓
ChatbotService (business logic)
  ↓
AiService (LangGraph agent)
  ↓
Tools (weather, reminders, etc.)
```

### Scheduled Tasks

- **Daily Summary** - Generates daily summary at 23:00
- **Football Updates** - Updates sports data at 12:59 and 23:59

## Database

**Database name**: `chatbot-db`

Collections:
- `conversations` - Chat history
- `reminders` - User reminders
- `users` - User profiles

## Tool Development

To add a new tool to the chatbot:

1. Create a tool file in `shared/ai/tools/{name}/{name}.tool.ts`
2. Define schema with Zod:

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const schema = z.object({
  param: z.string().describe('Parameter description'),
});

async function runner(input: z.infer<typeof schema>) {
  // Implementation
}

export const myTool = tool(runner, {
  name: 'my-tool',
  description: 'Tool description',
  schema,
});
```

3. Add to `features/chatbot/agent/index.ts`
4. Test thoroughly

## Troubleshooting

### Bot Not Responding

Check:
- Bot token is correct in `.env`
- OPENAI_API_KEY or ANTHROPIC_API_KEY is set
- MongoDB is running
- No errors in console logs

### API Rate Limiting

If you get rate limit errors:
- Reduce request frequency
- Upgrade API plan if available
- Implement exponential backoff

### Memory Issues

If the bot uses too much memory:
- Limit conversation history with MemorySaver settings
- Run cleanup job to archive old conversations
- Monitor with `npm run start:debug`

## Performance Tips

1. **Use faster models** - Use gpt-4-mini for faster responses
2. **Cache tool results** - Don't call same tool twice
3. **Limit history** - Keep only recent 10-20 messages
4. **Monitor logs** - Use Google Sheets logging in production

## Next Steps

- [Architecture Overview](/architecture/overview)
- [Tool Development](/development/ai-tools)
- [Testing Guide](/development/testing)
- [All Bots](/bots/overview)
