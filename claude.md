# MMPS Codebase Documentation

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Code Style](#code-style)
4. [Naming Conventions](#naming-conventions)
5. [Imports & Exports](#imports--exports)
6. [Async & Error Handling](#async--error-handling)
7. [Testing](#testing)
8. [Architecture Patterns](#architecture-patterns)
9. [Database Patterns](#database-patterns)
10. [Quick Reference](#quick-reference)

---

## Tech Stack

### Core
- **Plain TypeScript** - No framework, direct Node.js 24.x application
- **TypeScript 5.9.x** with ES2022 target, **non-strict mode**
- **node-cron** for scheduled tasks

### Key Dependencies
- **AI/LLM**: Anthropic SDK, OpenAI, LangChain, LangGraph (with MemorySaver)
- **Database**: MongoDB with native driver
- **Bot Platform**: Telegram Bot API (node-telegram-bot-api)
- **Date Handling**: date-fns, date-fns-tz (default timezone: `Asia/Jerusalem`)
- **Schema Validation**: Zod
- **MCP**: Model Context Protocol SDK for tool integrations
- **Testing**: Jest 30.x with ts-jest
- **Code Quality**: ESLint 9.x (flat config), Prettier

### Code Formatting
- **Prettier**: 200 char line width, single quotes, trailing commas, **semicolons required**
- **Path Aliases**: `@src/*`, `@core/*`, `@features/*`, `@services/*`, `@shared/*`, `@config/*`

---

## Project Structure

```
src/
├── core/           # Core utilities, config, mongo setup
├── features/       # Bot features (chatbot, coach, etc.)
├── services/       # External service integrations
├── shared/         # Shared business logic across features
└── main.ts         # Entry point with conditional bot loading
```

### Feature Structure
```
features/{name}/
├── {name}.init.ts                # Initialization with manual DI
├── {name}.controller.ts          # Telegram bot handlers
├── {name}.service.ts             # Business logic
├── {name}-scheduler.service.ts   # Scheduled tasks (if needed)
├── {name}.config.ts              # Bot configuration
├── types.ts                      # Type definitions
├── index.ts                      # Barrel exports
└── mongo/                        # Feature-specific repositories
```

### Service Structure
```
services/{name}/
├── api.ts or {name}.service.ts   # Main implementation
├── types.ts                      # Type definitions
├── constants.ts                  # Constants (if needed)
└── index.ts                      # Barrel exports
```

---

## Code Style

### Types - NEVER Use Interface

**CRITICAL: Always use `type` keyword. NEVER use `interface`.**

```typescript
// ✅ CORRECT
export type User = {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
};

// ❌ WRONG - NEVER use interface
interface User { /* ... */ }
```

**Key rules:**
- Use `type` keyword for all type definitions
- Mark properties as `readonly` for immutability
- Use utility types: `Omit<T, K>`, `Pick<T, K>`, `Partial<T>`

### Functions vs Classes

**Functions for:** utilities, API calls, repository operations, stateless logic

```typescript
// Utilities
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Repository operations
export async function createReminder(data: CreateReminderData): Promise<InsertOneResult<Reminder>> {
  const collection = getCollection();
  return collection.insertOne({ ...data, status: 'pending', createdAt: new Date() } as Reminder);
}
```

**Classes for:** services with state, controllers, schedulers

```typescript
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly aiService: AiService;

  async processMessage(message: string, chatId: number): Promise<ChatbotResponse> {
    // ...
  }
}

export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}
  init(): void { this.registerHandlers(); }
}
```

### Documentation Style

**No JSDoc.** Code should be self-documenting. Use inline comments only for:
- Format specifications: `readonly time: string; // Format: "YYYY-MM-DD HH:MM"`
- Complex logic clarifications
- Important configuration notes

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case with suffix | `chatbot-scheduler.service.ts`, `types.ts`, `index.ts` |
| Variables/Functions | camelCase | `weatherData`, `getUserByUsername()` |
| Constants | SCREAMING_SNAKE | `DEFAULT_TIMEZONE`, `BOT_CONFIG` |
| Types | PascalCase | `TwitterUser`, `CreateReminderData` |
| Classes | PascalCase + Suffix | `ChatbotService`, `ChatbotController` |

**File suffixes:** `.service.ts`, `.controller.ts`, `.init.ts`, `.config.ts`, `.spec.ts`

---

## Imports & Exports

### Import Order (auto-sorted by Prettier)
1. Third-party modules
2. `@core/*` → `@features/*` → `@services/*` → `@shared/*`
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

### Always async/await - NEVER .then() chains

```typescript
// ✅ CORRECT
async function getUserByUsername(username: string): Promise<TwitterUser | null> {
  const response = await axios.get<TwitterUserResponse>(url);
  return response.data.data || null;
}

// ❌ WRONG
function getUser(username: string) {
  return axios.get(url).then(r => r.data);
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

**1. Validation - throw errors:**
```typescript
if (!apiKey) throw new Error('API key not configured');
if (diffDays > 14) throw new Error('Forecast only available up to 14 days');
```

**2. Services - try-catch with Logger:**
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

**3. Non-critical - inline .catch():**
```typescript
await connectGithubMcp().catch((err) => console.error(err));

// Fallback pattern
await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' })
  .catch(() => bot.sendMessage(chatId, text));
```

### Logger Methods
- `logger.log()` - General info
- `logger.error()` - Errors
- `logger.warn()` - Warnings
- `logger.debug()` - Debug info

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

**Patterns:** Test files `*.spec.ts` alongside source, use `describe()` for grouping, `test.each()` for parameterized tests, `.toEqual()` for assertions.

---

## Architecture Patterns

### Core Patterns

#### Manual DI with Init Functions

```typescript
// features/chatbot/chatbot.init.ts
export async function initChatbot(): Promise<void> {
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

**main.ts conditional loading:**
```typescript
const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;
if (shouldInitBot(chatbotBotConfig)) await initChatbot();
```

#### Service Layer: Controller → Service → Repository

```typescript
// Controller - Telegram interactions
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}
  private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    const response = await this.chatbotService.processMessage(msg.text, msg.chat.id);
    await this.bot.sendMessage(msg.chat.id, response.message);
  }
}

// Service - Business logic
export class ChatbotService {
  async processMessage(message: string, chatId: number): Promise<ChatbotResponse> {
    const user = await getUserByChatId(chatId);
    return this.aiService.invoke(message);
  }
}
```

#### Cron Scheduler Pattern

```typescript
import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';

export class ChatbotSchedulerService {
  constructor(private readonly chatbotService: ChatbotService) {}

  init(): void {
    cron.schedule(`00 23 * * *`, () => this.handleDailySummary(), { timezone: DEFAULT_TIMEZONE });
    cron.schedule(`59 12,23 * * *`, () => this.handleFootballUpdate(), { timezone: DEFAULT_TIMEZONE });
  }
}
```

#### Configuration Pattern
```typescript
export const BOT_CONFIG = {
  name: 'Chatbot',
  commands: [
    { command: 'start', description: 'Start chatting' },
    { command: 'help', description: 'Show help' },
  ],
};
```

### AI Patterns

#### LangGraph Agent with Descriptor Pattern

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
    tools: [weatherTool, reminderTool, calendarTool],
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

#### AI Tools with Zod

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
    case 'current': return getCurrentWeather(location);
    case 'forecast': return getForecastWeather(location, date!);
  }
}

export const weatherTool = tool(runner, {
  name: 'weather',
  description: 'Get weather information',
  schema,
});
```

**Tool directory structure:**
```
shared/ai/tools/
├── weather/weather.tool.ts
├── reminders/reminder.tool.ts
└── index.ts
```

#### ToolCallbackHandler

```typescript
export type ToolCallbackOptions = {
  onToolStart?: (toolName: string, input: any) => void | Promise<void>;
  onToolEnd?: (toolName: string, output: any) => void | Promise<void>;
  onToolError?: (toolName: string, error: Error) => void | Promise<void>;
  enableLogging?: boolean;
};

export class ToolCallbackHandler extends BaseCallbackHandler {
  name = 'ToolCallbackHandler';
  async handleToolStart(tool, input) { /* log tool start */ }
  async handleToolEnd(output) { /* log completion */ }
  async handleToolError(error) { /* log errors */ }
}
```

### Feature-Specific Patterns

#### MessageLoader (Telegram)
Shows loading state while processing AI operations:
```typescript
const loader = new MessageLoader(this.bot, this.botToken, chatId, messageId, {
  loaderMessage: 'Processing...',
  reactionEmoji: '👀',
  loadingAction: BOT_BROADCAST_ACTIONS.TYPING,
});

await loader.handleMessageWithLoader(async () => {
  const response = await this.chatbotService.processMessage(text, chatId);
  await this.bot.sendMessage(chatId, response.message);
});
```
- Shows reaction emoji immediately
- Shows "typing..." action
- After 3s, shows loader message if action not complete
- Auto-cleanup after 15s

#### MCP Integration

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let mcpClient: Client | null = null;

export async function connectGithubMcp(): Promise<void> {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: env.GITHUB_TOKEN },
  });
  mcpClient = new Client({ name: 'mmps-client', version: '1.0.0' }, { capabilities: {} });
  await mcpClient.connect(transport);
}
```

#### Caching Pattern

```typescript
export class BaseCache<T> {
  private cache: Record<string, { value: T; timestamp: number }> = {};
  private readonly validForMs: number;

  constructor(validForMinutes: number) {
    this.validForMs = validForMinutes * 60 * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache[key];
    if (!entry || Date.now() - entry.timestamp > this.validForMs) return null;
    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache[key] = { value, timestamp: Date.now() };
  }
}
```

---

## Database Patterns

### Connection Management

```typescript
const connections: Map<string, Db> = new Map();

export async function createMongoConnection(dbName: string): Promise<void> {
  if (!env.MONGO_URI) throw new Error('MONGO_URI not defined');
  const client = new MongoClient(env.MONGO_URI);
  await client.connect();
  connections.set(dbName, client.db(dbName));
}

export function getMongoDb(dbName: string): Db {
  const db = connections.get(dbName);
  if (!db) throw new Error(`MongoDB connection for "${dbName}" not found`);
  return db;
}

export function getMongoCollection<T>(dbName: string, collectionName: string): Collection<T> {
  return getMongoDb(dbName).collection<T>(collectionName);
}
```

### Repository Functions

```typescript
function getCollection(): Collection<Reminder> {
  return getMongoCollection<Reminder>('chatbot-db', 'reminders');
}

export async function createReminder(data: CreateReminderData): Promise<InsertOneResult<Reminder>> {
  return getCollection().insertOne({
    ...data,
    status: 'pending',
    createdAt: new Date(),
  } as Reminder);
}

export async function getReminders(chatId: number): Promise<Reminder[]> {
  return getCollection().find({ chatId }).toArray();
}

export async function updateReminderStatus(id: ObjectId, status: Reminder['status']): Promise<UpdateResult> {
  return getCollection().updateOne({ _id: id }, { $set: { status, sentAt: new Date() } });
}
```

---

## Quick Reference

### DO
- Use `type` (NEVER `interface`)
- Mark types as `readonly`
- Use async/await (NEVER `.then()`)
- Use named exports (NEVER default)
- Use path aliases (`@core/*`, `@features/*`)
- Use repository functions (not classes) for DB
- Use `import type` for type-only imports
- Use `env` from `node:process`
- Use Logger in services
- Use Zod schemas for AI tools with `.describe()`
- Use semicolons (Prettier enforced)

### DON'T
- Use interfaces
- Use JSDoc comments
- Chain promises with `.then()`
- Use default exports
- Use relative imports for shared code
- Create repository classes
- Skip error handling
- Forget barrel `index.ts` exports
- Use magic numbers

### Environment Variables
```typescript
import { env } from 'node:process';
const apiKey = env.WEATHERAPI_KEY;
```

### Date Handling
```typescript
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
const zonedDate = toZonedTime(new Date(), 'Asia/Jerusalem');
```

### Project Context
- **7 bots**: chatbot (main), coach, langly, magister, wolt, worldly, striker
- **20+ AI tools** in `shared/ai/tools/`
- **30+ external services** (weather, sports, Google services, OpenAI, etc.)
- **Multi-bot development**: Use `LOCAL_ACTIVE_BOT_ID` env var to run individual bots

When in doubt, look at existing code in `features/` or `services/` directories.
