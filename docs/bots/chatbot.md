# Chatbot

**AI-Powered Conversational Assistant** - The flagship bot with advanced features and 20+ integrated tools.

## Overview

The Chatbot is MMPS's most advanced bot, powered by OpenAI's ChatGPT or Anthropic's Claude. It provides intelligent conversation with access to external tools like weather, reminders, calendar integration, GitHub, and more.

## Features

### Core Features
- **Conversational AI** - Natural language understanding and generation
- **Tool Integration** - 20+ tools for extending capabilities
- **Memory** - Durable conversation history persisted to MongoDB (LangGraph checkpointer), with automatic summarization to keep context bounded
- **Observability** - Per-turn token usage and cost are metered, logged, and persisted (90-day TTL), with a weekly summary
- **Streaming** - Conversational replies stream token-by-token (live "typing") via Telegram message drafts
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
GITHUB_APP_ID=123456                 # For GitHub App authentication
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...  # GitHub App private key
GITHUB_APP_INSTALLATION_ID=456789    # GitHub App installation ID for the repo
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

### 3. Set Up GitHub Integration (Optional)

To enable GitHub repository interactions:

1. **Create a GitHub App** at [github.com/settings/apps](https://github.com/settings/apps)
2. **Configure permissions**:
   - Issues: Read & Write
   - Pull requests: Read & Write
3. **Install the app** on your target repository
4. **Get credentials**:
   - App ID: Found in app settings
   - Private Key: Generate in app settings
   - Installation ID: 
     - For personal account: Go to [github.com/settings/installations](https://github.com/settings/installations)
     - For organization: Go to [github.com/organizations/{owner}/settings/installations](https://github.com/organizations)
     - Click your app installation → Check the URL for the installation ID
5. **Add to `.env`**:
   ```bash
   GITHUB_APP_ID=your-app-id
   GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
   GITHUB_APP_INSTALLATION_ID=your-installation-id
   ```

### 4. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=chatbot npm run start:dev
```

### 5. Start Chatting

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
- **Weekly Usage Summary** - Saturdays at 22:30, DMs the owner the past week's LLM cost/usage breakdown (from item #3's `aggregateUsage`)

### Memory & Context

Conversation memory is two complementary layers:

- **Persistence (checkpointer)** — `agent/checkpointer.ts` provides a MongoDB-backed LangGraph checkpointer (`@langchain/langgraph-checkpoint-mongodb`, db `Chatbot`, 30-day TTL), injected into `ChatbotService` via `chatbot.init.ts`. Each user's history is keyed by `thread_id` (derived from `chatId`) and **survives restarts and deploys** — replacing the in-memory `MemorySaver`.
- **Summarization** — `chatbot.service.ts` registers LangChain's `summarizationMiddleware`. When a thread grows past the trigger (~40 messages), the older turns are compressed into a running summary and the most recent (~20) are kept verbatim. The summary is persisted by the checkpointer, so old context is **compressed in Mongo rather than dropped**.

Tune via environment variables:

```bash
# Optional: conversation summarization (defaults in code)
CHATBOT_SUMMARY_TRIGGER_MESSAGES=40   # summarize once a thread passes this many messages
CHATBOT_SUMMARY_KEEP_MESSAGES=20      # recent messages kept verbatim after summarizing
```

### Token & Cost Observability

Every user turn is metered. A per-turn `UsageCallbackHandler` (`shared/ai/utils/usage-callback-handler.ts`) is attached to the agent `invoke` call as a runtime callback. It sums token usage across the whole ReAct loop (and the occasional summarization call) and counts LLM/tool calls, then `chatbot.service.ts` logs a `💰 usage` line and persists an aggregated record.

- **Cost** is computed from a small price map in `shared/ai/utils/model-pricing.ts` (USD per 1M tokens). Unknown models report cost `0` and log a warning.
- **Storage** — one record per turn in db `Chatbot`, collection `usage` (`features/chatbot/mongo/`), with a **90-day TTL**. Fields: `model`, `tokensIn`, `tokensOut`, `tokensTotal`, `cost`, `durationMs`, `llmCalls`, `toolCalls`, `createdAt`. Writes are fire-and-forget so metering never blocks a reply.
- **Aggregation** — `aggregateUsage({ chatId?, from?, to? })` rolls usage up per user per day (`Asia/Jerusalem`).
- **Weekly report** — a scheduler (`schedulers/usage-summary.ts`, Saturdays 22:30) calls `aggregateUsage` for the last 7 days and DMs the owner a cost/usage breakdown.
- **Kill-switch** — set `CHATBOT_USAGE_TRACKING=false` to disable entirely.

```bash
# Optional: per-turn token/cost observability (defaults on)
CHATBOT_USAGE_TRACKING=false   # disable token/cost metering
```

### Streaming Responses

Conversational replies — plain text messages, `/exercise`, and transcribed voice/audio — stream token-by-token so the Telegram message "types out" instead of appearing all at once. (`/help` and image analysis stay on the non-streaming path.)

- **Flow** — `ChatbotController.streamAgentReply` → `ChatbotService.streamMessage(message, chatId, onToken)` → `AiService.stream(..., { streamMode: 'messages' })`. Only the final answer's AI-content tokens are surfaced; tool messages and tool-call planning chunks are filtered out.
- **Telegram delivery** — `MessageStreamer` (`@services/telegram`) edits a live draft via grammY's `sendMessageDraft`, debounced (1500ms default) with 429 backoff. When the stream finishes, the final answer is sent through `sendRichMessage` for full markdown; if the stream errors mid-way, the partial text is kept with a ⚠️ note.
- **Keeps cost metering working** — the main model sets `streamUsage: true` so item #3 still meters streamed turns. The summarization middleware runs on a **separate non-streaming model** (`disableStreaming: true`) so its summary tokens never leak into the reply.

## Database

**Database name**: `chatbot-db`

Collections:
- `conversations` - Chat history
- `reminders` - User reminders
- `users` - User profiles

The `Chatbot` database additionally holds LangGraph checkpoints (memory) and the `usage` collection (per-turn token/cost records, 90-day TTL).

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
- Lower `CHATBOT_SUMMARY_TRIGGER_MESSAGES` / `CHATBOT_SUMMARY_KEEP_MESSAGES` so threads are summarized sooner and kept shorter
- Old conversations expire automatically via the checkpointer's 30-day TTL
- Monitor with `npm run start:debug`

## Performance Tips

1. **Use faster models** - Use gpt-4-mini for faster responses
2. **Cache tool results** - Don't call same tool twice
3. **Bound context** - Summarization keeps thread size in check; tune the trigger/keep thresholds
4. **Monitor logs** - Use Google Sheets logging in production

## Next Steps

- [Architecture Overview](/architecture/overview)
- [Tool Development](/development/ai-tools)
- [Testing Guide](/development/testing)
- [All Bots](/bots/overview)
