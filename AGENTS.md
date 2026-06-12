# AGENTS.md

Single source of truth for AI agents (Claude Code, GitHub Copilot, Cursor, etc.) working in this repo. `CLAUDE.md` and `.github/copilot-instructions.md` are symlinks to this file — edit here, both pick it up.

Read this top-to-bottom on first contact with the repo. It is intentionally dense so you can skip exploratory grepping for things that are already documented here.

---

## TL;DR for a fresh agent

- **What this is:** Plain TypeScript (no framework) Node.js 24 app hosting **6 Telegram bots** + an Express HTTP server (Swagger + auth routes). Built around grammY, LangGraph, MongoDB native driver.
- **Entry point:** `src/index.ts` (not `main.ts`). Bots are conditionally initialized based on `IS_PROD` or `LOCAL_ACTIVE_BOT_ID`.
- **6 bots:** `chatbot`, `chilli`, `coach`, `expenses`, `wolt`, `worldly`. Each lives in `src/features/{bot}/`.
- **Local dev:** Set `LOCAL_ACTIVE_BOT_ID=<BOT_ID>` (uppercase, e.g. `COACH`) in `.env`, then `npm run dev`. Only that bot boots.
- **Telegram service:** All bots use grammY via `@services/telegram` (the only telegram path — `@services/telegram-grammy` does NOT exist; any reference to it is stale).
- **AI:** Agents are built with LangGraph (`createAgent` from `langchain`), tools defined via `tool()` + Zod schema, registered through an `AgentDescriptor`.
- **DB:** MongoDB. Connections are managed by name (`createMongoConnection('chatbot-db')`), accessed via `getMongoCollection<T>(dbName, collectionName)`.
- **Apps workspace:** `apps/coach-web`, `apps/chatbot-web`, `apps/expenses-web` are Vite mini-apps (npm workspaces).

---

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans, remove imports/variables/functions that YOUR changes made unused. Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

### 5. Never Commit Unless Asked

**Do not run `git commit` (or `git push`) unless the user explicitly tells you to.**

- Make and stage changes, but leave committing to the user unless they ask.
- "Fix X", "add Y", "implement Z" means write the code — not commit it.
- Only commit when the user says so (e.g. "commit this", "commit and push").
- This also applies to creating tags, amending, or rewriting history.

---

## Tech Stack

### Core
- **Plain TypeScript** — no framework, direct Node.js 24.x application
- **TypeScript 5.9** with ES2022 target, **non-strict** mode
- **Express 5** (HTTP server for Swagger UI, auth, webhooks)
- **node-cron** for scheduled tasks

### Key Dependencies
- **AI/LLM:** `@anthropic-ai/sdk`, `openai`, `langchain`, `@langchain/langgraph` (with `MemorySaver`), `@langchain/anthropic`, `@langchain/openai`
- **Database:** `mongodb` (native driver, no ODM)
- **Bot Platform:** `grammy` (+ `@grammyjs/hydrate`)
- **Date Handling:** `date-fns`, `date-fns-tz` (default timezone: `Asia/Jerusalem`)
- **Schema Validation:** `zod`
- **Testing:** Vitest 4.x (unit specs in `src/**/*.spec.ts`, integration specs under `test/integration/`, E2E bot specs under `test/e2e/`)
- **Code Quality:** ESLint 9 (flat config), Prettier 3
- **Vector DB:** `@pinecone-database/pinecone`
- **Telegram MTProto:** `telegram` (for client-mode features, separate from bot)
- **Other notable:** `canvas`, `sharp`, `cheerio`, `youtube-transcript-plus`, `googleapis`, `twilio`, `yahoo-finance2`, `octokit`, `jose` (JWT for auth), `vitepress` (docs)

### Code Formatting
- **Prettier:** 200 char line width, single quotes, trailing commas, **semicolons required**
- **Path Aliases (`tsconfig.json`):**
  - `@src/*` → `src/*`
  - `@core/*` → `src/core/*`
  - `@features/*` → `src/features/*`
  - `@services/*` → `src/services/*`
  - `@shared/*` → `src/shared/*`
  - `@decorators` → `src/decorators`
  - `@mocks` → `src/core/mocks`
  - `@config/*` → `src/config/*`
  - `@test/*` → `test/*`

---

## Project Structure

```
mmps/
├── src/
│   ├── core/           # Config, mongo, openapi/swagger, services, utils
│   ├── features/       # The 6 bots (chatbot, chilli, coach, expenses, wolt, worldly)
│   ├── services/       # 30+ external service integrations
│   ├── shared/         # Cross-bot business logic (AI tools live here)
│   └── index.ts        # Entry point — Express server + conditional bot init
├── apps/               # npm workspaces — Vite mini-apps for bots
│   ├── coach-web/
│   ├── chatbot-web/
│   ├── expenses-web/
│   └── stacker-web/    # Legacy, no active bot
├── docs/               # VitePress site (matansocher.github.io/mmps)
├── scripts/            # Standalone scripts (cleanup, migrations, etc.)
├── assets/             # Static assets (downloads dir, images)
├── .github/
│   ├── workflows/      # ci.yml, claude.yml (AI review/implement), docs-deploy.yml
│   └── copilot-instructions.md → ../AGENTS.md   # symlink
├── .claude/
│   ├── settings.json
│   └── skills/         # MMPS-specific Claude Code skills
├── AGENTS.md           # ← you are here (canonical)
├── CLAUDE.md → AGENTS.md                          # symlink
└── .env.example        # All env vars the code references
```

### Feature Structure (per bot)
```
src/features/{name}/
├── {name}.init.ts                # initX(app) — wires DI, registers routes/bot
├── {name}.controller.ts          # grammY handlers (ctx-driven)
├── {name}.service.ts             # Business logic
├── {name}-scheduler.service.ts   # Cron jobs (if needed)
├── {name}.config.ts              # BOT_CONFIG: { id, name, token }
├── launcher.service.ts           # (some bots) Mini-app deep-link helpers
├── types.ts
├── index.ts                      # Barrel — exports BOT_CONFIG + init function
├── agent/                        # (chatbot only) LangGraph agent + factory
├── schedulers/                   # (chatbot) Scheduler implementations
└── mongo/                        # Feature-specific repositories
```

### Service Structure
```
src/services/{name}/
├── api.ts or {name}.service.ts   # Main implementation
├── types.ts
├── constants.ts                  # (if needed)
└── index.ts                      # Barrel exports
```

---

## The 6 Bots

| ID         | Display Name    | Path                          | Env token                       | Purpose |
|------------|-----------------|-------------------------------|---------------------------------|---------|
| `CHATBOT`  | Chatbot 🤖      | `src/features/chatbot/`       | `CHATBOT_TELEGRAM_BOT_TOKEN`    | AI assistant with 30+ tools (weather, calendar, gmail, reminders, sports, exercise, recipes, github, polymarket, spotify, youtube-follower, etc.); dashboard mini-app (`apps/chatbot-web`). |
| `CHILLI`   | Chilli 🐱       | `src/features/chilli/`        | `CHILLI_TELEGRAM_BOT_TOKEN`     | Persona bot — replies as the user's cat in Hebrew (uses GPT-small). |
| `COACH`    | Coach Bot ⚽️    | `src/features/coach/`         | `COACH_TELEGRAM_BOT_TOKEN`      | Sports analytics, predictions, schedules; has a Vite mini-app (`apps/coach-web`). |
| `EXPENSES` | Expenses 💸     | `src/features/expenses/`      | `EXPENSES_TELEGRAM_BOT_TOKEN`   | Expense tracker mini-app (`apps/expenses-web`) backed by the shared `Expenses` Mongo DB. |
| `WOLT`     | Wolt Bot 🍔     | `src/features/wolt/`          | `WOLT_TELEGRAM_BOT_TOKEN`       | Watches Wolt restaurants and notifies on availability. |
| `WORLDLY`  | Worldly Bot 🌍  | `src/features/worldly/`       | `WORLDLY_TELEGRAM_BOT_TOKEN`    | Geography quiz/education. |

**Boot logic** (`src/index.ts`):
```typescript
const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;
shouldInitBot(chatbotConfig)  && (await initChatbot(app));
shouldInitBot(chilliConfig)   && (await initChilli());
shouldInitBot(coachConfig)    && (await initCoach(app));
shouldInitBot(expensesConfig) && (await initExpenses(app));
shouldInitBot(woltConfig)     && (await initWolt(app));
shouldInitBot(worldlyConfig)  && (await initWorldly(app));
```

In production all six run. Locally, set `LOCAL_ACTIVE_BOT_ID` to the bot ID (uppercase, e.g. `COACH`) to run only that one.

---

## Code Style

### Types — NEVER use `interface`

**CRITICAL: Always use `type`. NEVER use `interface`.**

```typescript
// ✅ CORRECT
export type User = {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
};

// ❌ WRONG
interface User { /* ... */ }
```

Rules:
- Use `type` for all type definitions.
- Mark properties `readonly` for immutability.
- Prefer utility types: `Omit<T, K>`, `Pick<T, K>`, `Partial<T>`.

### Functions vs Classes

**Functions for:** utilities, API calls, repository operations, stateless logic.

```typescript
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createReminder(data: CreateReminderData): Promise<InsertOneResult<Reminder>> {
  return getCollection().insertOne({ ...data, status: 'pending', createdAt: new Date() } as Reminder);
}
```

**Classes for:** services with state, controllers, schedulers.

```typescript
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly aiService: AiService;

  async processMessage(message: string, chatId: number): Promise<ChatbotResponse> { /* ... */ }
}

export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}
  init(): void { /* register grammY handlers */ }
}
```

### Documentation Style

**No JSDoc.** Code should be self-documenting. Use inline `//` comments only for:
- Format specifications: `readonly time: string; // Format: "YYYY-MM-DD HH:MM"`
- Non-obvious logic
- Important configuration notes

### Naming Conventions

| Type                | Convention            | Example                                    |
|---------------------|-----------------------|--------------------------------------------|
| Files               | kebab-case + suffix   | `chatbot-scheduler.service.ts`, `types.ts` |
| Variables/Functions | camelCase             | `weatherData`, `getUserByUsername()`       |
| Constants           | SCREAMING_SNAKE       | `DEFAULT_TIMEZONE`, `BOT_CONFIG`           |
| Types               | PascalCase            | `TwitterUser`, `CreateReminderData`        |
| Classes             | PascalCase + Suffix   | `ChatbotService`, `ChatbotController`      |

**File suffixes:** `.service.ts`, `.controller.ts`, `.init.ts`, `.config.ts`, `.spec.ts`.

---

## Imports & Exports

### Import Order (auto-sorted by Prettier)
1. Third-party modules
2. `@core/*` → `@decorators/*` → `@features/*` → `@mocks/*` → `@services/*` → `@shared/*` → `@test/*`
3. Relative imports (`./`, `../`)

```typescript
import { ChatAnthropic } from '@langchain/anthropic';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { BOT_CONFIG } from './chatbot.config';
```

### Export Rules

**Named exports only. NEVER use default exports.**

```typescript
// ✅ Barrel exports (index.ts)
export * from './types';
export { ChatbotService } from './chatbot.service';

// ✅ Type imports
import type { ObjectId } from 'mongodb';
```

---

## Async & Error Handling

### Always async/await — NEVER `.then()` chains

```typescript
// ✅
async function getUserByUsername(username: string): Promise<TwitterUser | null> {
  const response = await axios.get<TwitterUserResponse>(url);
  return response.data.data || null;
}

// ❌
function getUser(username: string) {
  return axios.get(url).then((r) => r.data);
}
```

### Parallel Operations
```typescript
await Promise.all([
  createMongoConnection('chatbot-db'),
  createMongoConnection('coach-db'),
]);
```

### Error Handling Patterns

**1. Validation — throw early:**
```typescript
if (!apiKey) throw new Error('API key not configured');
if (diffDays > 14) throw new Error('Forecast only available up to 14 days');
```

**2. Services — try/catch with Logger:**
```typescript
async processMessage(message: string): Promise<ChatbotResponse> {
  try {
    return await this.aiService.invoke(message);
  } catch (err) {
    this.logger.error(`Error: ${err}`);
    return { message: 'An error occurred', toolResults: [] };
  }
}
```

**3. Non-critical — inline `.catch()`:**
```typescript
await connectGithubMcp().catch((err) => console.error(err));
```

### Logger

```typescript
import { Logger } from '@core/utils';
const logger = new Logger('MyClass');
logger.log('info');     // general
logger.error('boom');   // errors
logger.warn('careful'); // warnings
logger.debug('trace');  // debug
```

---

## Architecture Patterns

### Manual DI via Init Functions

```typescript
// features/chatbot/chatbot.init.ts
export async function initChatbot(app: Express): Promise<void> {
  await Promise.all([
    createMongoConnection('chatbot-db'),
    connectGithubMcp().catch((err) => console.error(err)),
  ]);

  const chatbotService = new ChatbotService();
  const chatbotController = new ChatbotController(chatbotService);
  const chatbotScheduler = new ChatbotSchedulerService(chatbotService);

  chatbotController.init();
  chatbotScheduler.init();
}
```

Init functions accept the Express `app` only if they register HTTP routes (auth, swagger, mini-app endpoints). `initChilli()` takes no args.

### Layered: Controller → Service → Repository

**Controller** — grammY handlers; prefer `ctx.*` methods over `bot.api.*` when `ctx` is available.

```typescript
export class CoachController {
  private readonly bot = provideTelegramBot(BOT_CONFIG);
  constructor(private readonly coachService: CoachService) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
    this.bot.on('callback_query', (ctx) => this.callbackQueryHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await ctx.reply(welcomeMessage);
  }
}
```

**Service** — business logic; uses `bot.api.*` when there is no `ctx`:

```typescript
export class CoachService {
  private readonly bot = provideTelegramBot(BOT_CONFIG);
  async sendChallenge(chatId: number): Promise<void> {
    const keyboard = buildInlineKeyboard([{ text: 'Subscribe', data: 'subscribe' }]);
    await this.bot.api.sendMessage(chatId, message, { reply_markup: keyboard });
  }
}
```

### Cron Scheduler

```typescript
import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';

export class ChatbotSchedulerService {
  constructor(private readonly chatbotService: ChatbotService) {}

  init(): void {
    cron.schedule('00 23 * * *', () => this.handleDailySummary(), { timezone: DEFAULT_TIMEZONE });
    cron.schedule('59 12,23 * * *', () => this.handleFootballUpdate(), { timezone: DEFAULT_TIMEZONE });
  }
}
```

### Telegram (grammY) — `@services/telegram`

All Telegram code goes through `@services/telegram`. There is **no `@services/telegram-grammy`** — that path was used during migration and no longer exists. Any reference to it is stale and should be replaced with `@services/telegram`.

Public exports (from `src/services/telegram/index.ts`):
- `provideTelegramBot(config)` — memoized `Bot` instance per bot ID.
- `buildInlineKeyboard([{ text, data }])` — each button on its own row; `data` → `callback_data`.
- `getMessageData(ctx)`, `getCallbackQueryData(ctx)` — extract `{ chatId, userDetails, text, ... }`.
- `MessageLoader` — shows reaction + typing + delayed loader message during long ops.
- `MessageStreamer` — streaming message updates for LLM responses.
- `sendStyledMessage`, `sendShortenedMessage` — fallback-safe markdown sender.
- `downloadFile` — voice/photo/document downloader.
- `removeItemFromInlineKeyboardMarkup`.
- Types: `TelegramBotConfig`, `MessageData`, `CallbackQueryData`, `UserDetails`, etc.

**File sending:** when calling grammY methods like `sendVoice`, `sendPhoto`, `sendDocument`, wrap paths with `new InputFile(path)` from `grammy`. Raw path strings are rejected.

### Inline keyboard helper

```typescript
import { buildInlineKeyboard } from '@services/telegram';

const keyboard = buildInlineKeyboard([
  { text: 'Subscribe', data: 'subscribe' },
  { text: 'Settings', data: 'settings' },
]);
await ctx.reply('Menu:', { reply_markup: keyboard });
```

### MessageLoader

```typescript
const loader = new MessageLoader(this.bot, chatId, messageId, {
  loaderMessage: 'Processing...',
  reactionEmoji: '👀',
  loadingAction: 'typing',
});
await loader.handleMessageWithLoader(async () => {
  const response = await this.chatbotService.processMessage(text, chatId);
  await sendStyledMessage(this.bot, chatId, response.message);
});
```

Shows reaction emoji immediately, "typing…" action, loader message after 3s, auto-cleanup after 15s.

### GitHub Automation

Two GitHub labels trigger workflows in `.github/workflows/claude.yml`:
- **`review`** on a PR → AI code review
- **`implement`** on an issue → AI creates an implementation PR

The chatbot agent has a `githubTool` that can add these labels through natural language.

### Caching

```typescript
export class BaseCache<T> {
  private cache: Record<string, { value: T; timestamp: number }> = {};
  private readonly validForMs: number;
  constructor(validForMinutes: number) { this.validForMs = validForMinutes * 60 * 1000; }
  get(key: string): T | null {
    const entry = this.cache[key];
    if (!entry || Date.now() - entry.timestamp > this.validForMs) return null;
    return entry.value;
  }
  set(key: string, value: T): void { this.cache[key] = { value, timestamp: Date.now() }; }
}
```

---

## AI Patterns

### Agent Descriptor

`src/features/chatbot/agent/` shows the canonical pattern.

```typescript
// types.ts
export type AgentDescriptor = {
  readonly name: string;
  readonly prompt: string;
  readonly description: string;
  readonly tools: StructuredTool[];
};

// agent.ts
export function agent(): AgentDescriptor {
  return {
    name: 'CHATBOT',
    prompt: `You are a helpful AI assistant...`,
    description: 'AI assistant with tools',
    tools: [weatherTool, reminderTool, calendarTool /* ... */],
  };
}

// factory.ts
export function createAgentService(descriptor: AgentDescriptor, opts: CreateAgentOptions): AiService {
  const { model, checkpointer = new MemorySaver(), toolCallbackOptions } = opts;
  const callbacks = toolCallbackOptions ? [new ToolCallbackHandler(toolCallbackOptions)] : undefined;
  const reactAgent = createAgent({ model, tools: descriptor.tools, systemPrompt: descriptor.prompt, checkpointer });
  return new AiService(reactAgent.graph, { name: descriptor.name, callbacks });
}
```

### Tool with Zod

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const schema = z.object({
  action: z.enum(['current', 'forecast']).describe('Action to perform'),
  location: z.string().describe('The city or location'),
  date: z.string().optional().describe('Date in YYYY-MM-DD format'),
});

async function runner({ action, location, date }: z.infer<typeof schema>) {
  switch (action) {
    case 'current':  return getCurrentWeather(location);
    case 'forecast': return getForecastWeather(location, date!);
  }
}

export const weatherTool = tool(runner, {
  name: 'weather',
  description: 'Get weather information',
  schema,
});
```

### Tool directory layout

```
src/shared/ai/tools/
├── weather/weather.tool.ts
├── reminders/reminder.tool.ts
└── index.ts          # barrel — every tool re-exported here
```

### Available AI Tools (34, registered in `src/features/chatbot/agent/agent.ts`)

Grouped roughly by domain:

- **Personal / productivity:** `calendar`, `gmail`, `reminders`, `preferences`, `contacts`, `recipes`, `exercise`, `exercise-analytics`
- **Media / lifestyle:** `spotify`, `youtube-follower`, `selfie`, `image` (analyzer + generation), `audio` (transcribe + TTS)
- **Information:** `weather`, `rain-radar`, `earthquake`, `maps` (places + place details), `stocks`, `crypto`, `currency-exchange`, `flights`
- **Sports / games:** `sports` (competitions list/matches/table, match summary, top matches for prediction, match prediction), `makavdia` (NBA Deni Avdija), `wolt` (delivery stats), `worldly` (geography game stats)
- **Markets:** `polymarket`
- **Dev tooling:** `github`

When adding a new tool: create `src/shared/ai/tools/{name}/{name}.tool.ts`, add to `src/shared/ai/tools/index.ts` barrel, register in `src/features/chatbot/agent/agent.ts`.

### ToolCallbackHandler

```typescript
export type ToolCallbackOptions = {
  onToolStart?: (toolName: string, input: any) => void | Promise<void>;
  onToolEnd?: (toolName: string, output: any) => void | Promise<void>;
  onToolError?: (toolName: string, error: Error) => void | Promise<void>;
  enableLogging?: boolean;
};
```

---

## Database Patterns

### Connection Management

```typescript
const connections: Map<string, Db> = new Map();

export async function createMongoConnection(dbName: string): Promise<void> {
  const client = new MongoClient(env.MONGO_DB_URL);
  await client.connect();
  connections.set(dbName, client.db(dbName));
}

export function getMongoCollection<T>(dbName: string, collectionName: string): Collection<T> {
  return connections.get(dbName).collection<T>(collectionName);
}
```

The connection string env var is **`MONGO_DB_URL`** (used by `src/core/mongo/mongo-connection.ts`). A handful of standalone migration scripts under `src/**/scripts/` use the legacy `MONGO_URI` — both should typically point at the same cluster.

### Repository Functions

```typescript
function getCollection(): Collection<Reminder> {
  return getMongoCollection<Reminder>('chatbot-db', 'reminders');
}

export async function createReminder(data: CreateReminderData): Promise<InsertOneResult<Reminder>> {
  return getCollection().insertOne({ ...data, status: 'pending', createdAt: new Date() } as Reminder);
}
```

Each bot uses its own database (`chatbot-db`, `coach-db`, etc.). The auth subsystem under `@shared/auth` has its own `DB_NAME`.

---

## HTTP / Express Surface

`src/index.ts` runs an Express server alongside the bots:

- `GET /` — health (`{ success: true }`)
- `/api-docs` etc. — Swagger UI (`registerSwaggerRoutes`)
- `/api/auth/*` — Telegram-login OIDC for the companion browser extension. CORS enabled when `COMPANION_ORIGIN` is set.
- Each bot's `init({app})` may register its own routes (mini-app data endpoints, webhooks, etc.).

---

## External Services (catalog)

Located in `src/services/`. Each has its own README-via-code structure (`api.ts` / `*.service.ts` + `types.ts` + `constants.ts` + `index.ts`):

| Service                | Purpose                                    |
|------------------------|--------------------------------------------|
| `alpha-vantage`        | Stock fundamentals & quotes                |
| `anthropic`            | Claude API helpers                         |
| `earthquake-api`       | USGS quake feed                            |
| `earthquake-map`       | Canvas-based earthquake map rendering      |
| `github`               | Octokit + GitHub App auth                  |
| `gmail`                | Gmail send/list/delete                     |
| `google-calendar`      | Calendar CRUD                              |
| `google-sheets`        | Sheets logging (prod)                      |
| `google-translate`     | Translation                                |
| `imgur`                | Image upload                               |
| `ims`                  | Israel Meteorological Service              |
| `notifier`             | Cross-bot notifier (uses `NOTIFIER_TELEGRAM_BOT_TOKEN`) |
| `open-weather-map`     | Weather (one provider)                     |
| `openai`               | OpenAI API helpers                         |
| `opensky`              | Flight tracking                            |
| `pinecone`             | Vector DB                                  |
| `polymarket`           | Prediction markets                         |
| `rain-radar`           | Rain radar imagery                         |
| `scores-365`           | Football live scores                       |
| `spotify`              | Spotify API + auth refresh                 |
| `telegram`             | grammY-based bot utilities (this is THE telegram service) |
| `telegram-client`      | MTProto client (user-mode) for message history |
| `tenor`                | GIF search                                 |
| `tiktok`               | TikTok scraping (RapidAPI)                 |
| `twilio`               | SMS/voice                                  |
| `twitter`              | Twitter API v2                             |
| `tzevaadom`            | Israel rocket alert feed                   |
| `weather`              | Weather aggregator                         |
| `weather-api`          | weatherapi.com                             |
| `xai`                  | xAI (Grok) API                             |
| `yahoo-finance`        | Equity quotes                              |
| `youtube`              | YouTube transcript + scraping              |
| `youtube-v3`           | YouTube Data API v3                        |

---

## Shared Modules

Located in `src/shared/`. Reusable across bots:

`ai/` (agents, tools, utils), `auth/` (Telegram OIDC for companion extension), `calendar-events`, `coach`, `coach-api`, `cooker`, `flights-tracker`, `friends`, `map-service`, `polymarket-follower`, `preferences`, `reminders`, `selfie`, `sports`, `striker`, `trainer`, `wolt`, `wolt-api`, `worldly`, `worldly-api`, `youtube-follower`.

---

## Environment Variables

The full list is in `.env.example`. Everything that the code references via `env.X` is documented there. Highlights:

**Required for any local dev:**
- `MONGO_DB_URL` — Mongo connection string (the main code path uses this).
- `LOCAL_ACTIVE_BOT_ID` — `CHATBOT | CHILLI | COACH | WOLT | WORLDLY` (UPPERCASE). Selects which bot boots locally.
- One of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (depending on which agents you exercise).
- The `*_TELEGRAM_BOT_TOKEN` for whichever bot you set as `LOCAL_ACTIVE_BOT_ID`.

**Convenience flags:**
- `IS_PROD=true` runs all five bots regardless of `LOCAL_ACTIVE_BOT_ID`.
- `PORT` — Express port (default 3000).

Everything else is feature-specific (Spotify, GitHub App, Google services, Twilio, Pinecone, RapidAPI, etc.) and only needed if you exercise the corresponding tools.

### Date Handling

```typescript
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
const zonedDate = toZonedTime(new Date(), 'Asia/Jerusalem');
```

Project default timezone is `Asia/Jerusalem` (`DEFAULT_TIMEZONE` in `@core/config`).

---

## Common Commands

```bash
npm run dev               # tsx watch src/index.ts — local bot dev
npm run dev:debug         # with --inspect
npm run build             # tsc + tsc-alias + build mini-apps
npm start                 # node dist/index.js (production)
npm test                  # Vitest (unit)
npm run test:watch
npm run test:integration  # Vitest integration suite
npm run test:e2e          # Vitest bot E2E suite (grammY mock harness)
npm run lint
npm run lint:fix
npm run format
npm run docs:dev          # VitePress local dev
npm run docs:build

# Mini-app workspaces
npm run dev:coach-web
```

---

## Testing

```typescript
describe('formatNumber()', () => {
  test.each([
    { num: 1000, expected: '1.0K' },
    { num: 1000000, expected: '1.0M' },
  ])('should return $expected when num is $num', ({ num, expected }) => {
    expect(formatNumber(num)).toEqual(expected);
  });
});

describe('hasHebrew()', () => {
  it('should return true if text is in hebrew', () => {
    expect(hasHebrew('שלום')).toEqual(true);
  });
});
```

Conventions: `*.spec.ts` next to source, `describe()` for grouping, `test.each()` for table-driven, `.toEqual()` for assertions.

---

## Project-Local Claude Skills

`.claude/skills/` ships skills tailored to MMPS. Triggered via slash command in Claude Code:

- `/review-style` — Check changed files against MMPS conventions (type vs interface, `.then()`, default exports, JSDoc, `readonly`, telegram import path, barrel exports, `bot.api` in controllers).
- `/planner` — Plan a new feature with the file table + reference patterns.
- `/update-docs` — Sync VitePress docs in `docs/` with recent code changes.
- `/playwright`, `/humanizer`, `/fact-checker`, `/prompt-master` — general-purpose, not MMPS-specific.

Skills live in `.claude/skills/{name}/SKILL.md` and follow the standard Claude Code skill frontmatter.

---

## Quick Reference

### DO
- Use `type` (NEVER `interface`).
- Mark types as `readonly`.
- Use `async/await` (NEVER `.then()` chains).
- Use named exports (NEVER default).
- Use path aliases (`@core/*`, `@features/*`, `@services/*`, `@shared/*`).
- Use repository **functions** (not classes) for DB access.
- Use `import type` for type-only imports.
- Use `env` from `node:process`.
- Use `Logger` from `@core/utils` in services/controllers.
- Use Zod schemas for AI tools with `.describe()` on every field.
- Use grammY `ctx.*` methods in controllers when `ctx` is available.
- Use `buildInlineKeyboard([{ text, data }])` from `@services/telegram` for inline keyboards.
- Use `getMessageData(ctx)` / `getCallbackQueryData(ctx)` from `@services/telegram`.
- Use `new InputFile(path)` from `grammy` when sending files.
- Add barrel exports in `index.ts` for new files.
- Use semicolons (Prettier enforced).

### DON'T
- Use `interface`.
- Use JSDoc comments.
- Chain promises with `.then()`.
- Use default exports.
- Use relative imports for shared code.
- Create repository **classes**.
- Use `this.bot.api.*` in controllers when `ctx` is available (use `ctx.reply()`, `ctx.deleteMessage()`, etc.).
- Import from `node-telegram-bot-api` (legacy; this codebase is fully grammY).
- Import from `@services/telegram-grammy` — this path does NOT exist. Use `@services/telegram`.
- Use `getInlineKeyboardMarkup` — use `buildInlineKeyboard` instead.
- Forget to update the barrel `index.ts`.
- Commit or push unless the user explicitly asks you to.

---

## When in doubt

Read an analogous existing file in `features/` or `services/` — pick the closest match and follow its shape. Pattern-by-example beats abstract description every time in this repo.
