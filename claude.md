# MMPS Codebase Documentation

This document provides comprehensive guidance for working with the MMPS codebase. It captures the coding style, patterns, and conventions used throughout the project.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Code Style Preferences](#code-style-preferences)
4. [Naming Conventions](#naming-conventions)
5. [Import/Export Patterns](#importexport-patterns)
6. [Async/Await Patterns](#asyncawait-patterns)
7. [Error Handling](#error-handling)
8. [Documentation Style](#documentation-style)
9. [Testing Patterns](#testing-patterns)
10. [Architecture Patterns](#architecture-patterns) (includes LangGraph Agents, MessageLoader, ToolCallbackHandler, MCP, AI Tools with Zod)
11. [MongoDB Patterns](#mongodb-patterns)
12. [Notable Conventions](#notable-conventions)
13. [Do's and Don'ts](#dos-and-donts)
14. [Project-Specific Patterns](#project-specific-patterns)

---

## Tech Stack

### Core Framework
- **Plain TypeScript** - No framework, direct Node.js application
- **Node.js 24.x**
- **TypeScript 5.9.x** with ES2022 target
- **node-cron** for scheduled tasks

### Key Dependencies
- **AI/LLM**: Anthropic SDK, OpenAI, LangChain, LangGraph (with MemorySaver checkpointer)
- **Database**: MongoDB with native driver
- **Bot Platform**: Telegram Bot API (node-telegram-bot-api)
- **Date Handling**: date-fns, date-fns-tz
- **Scheduling**: node-cron
- **Schema Validation**: Zod
- **MCP**: Model Context Protocol SDK for tool integrations
- **Testing**: Jest 30.x with ts-jest
- **Code Quality**: ESLint 9.x (flat config), Prettier with import sorting plugin
- **Git Hooks**: Husky, Commitlint (conventional commits)
- **Release Management**: Semantic Release

### TypeScript Configuration
- **Non-strict mode** (strictNullChecks, noImplicitAny, strictBindCallApply all disabled)
- ESLint: `@typescript-eslint/no-explicit-any` set to 'warn' (any types discouraged but allowed)
- ES2022 target with CommonJS modules

### Code Formatting
- **Prettier**: 200 character line width, single quotes, trailing commas, **semicolons required**
- **Path Aliases**: `@src/*`, `@core/*`, `@features/*`, `@services/*`, `@shared/*`, `@config/*`, `@mocks`, `@test/*`

---

## Project Structure

### Top-Level Organization

```
src/
├── core/           # Core utilities, config, mongo setup
├── features/       # Bot features (chatbot, coach, etc.)
├── services/       # External service integrations (openai, twitter, weather, etc.)
├── shared/         # Shared business logic used across features
└── main.ts         # Application entry point with conditional bot loading
```

### Feature Pattern

Each feature follows a consistent structure:

```
features/{name}/
├── {name}.init.ts                # Initialization with manual DI
├── {name}.controller.ts          # Telegram bot handlers
├── {name}.service.ts             # Business logic
├── {name}-scheduler.service.ts   # Scheduled tasks (if needed)
├── {name}.config.ts              # Bot configuration
├── types.ts                      # Type definitions
├── index.ts                      # Public exports (barrel file)
├── utils/                        # Feature-specific utilities
└── mongo/                        # Feature-specific DB repositories
```

### Service Module Pattern

```
services/{name}/
├── api.ts or {name}.service.ts   # Main implementation
├── types.ts                      # Type definitions
├── constants.ts                  # Constants (if needed)
├── utils/                        # Helper functions
└── index.ts                      # Barrel exports
```

---

## Code Style Preferences

### 1. Types vs Interfaces - ALWAYS USE TYPES

**CRITICAL: This codebase exclusively uses `type` keyword. NEVER use `interface`.**

```typescript
// ✅ CORRECT - Always use type
export type User = {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
};

export type TwitterUser = {
  readonly id: string;
  readonly name: string;
  readonly username: string;
  readonly public_metrics: {
    readonly followers_count: number;
    readonly following_count: number;
  };
};

export type CreateReminderData = {
  readonly chatId: number;
  readonly message: string;
  readonly remindAt: Date;
};

// ❌ WRONG - NEVER use interface
interface User {  // DON'T DO THIS
  _id?: ObjectId;
  telegramUserId: number;
}
```

**Key Points:**
- Use `type` keyword for all type definitions
- Mark properties as `readonly` extensively for immutability
- Use utility types like `Omit`, `Pick`, `Partial` when deriving types
- No interfaces anywhere in the codebase

### 2. Functions vs Classes

**Use a mixed approach with clear patterns:**

#### Use Functions For:
- Utility functions (pure functions)
- Service API calls
- Repository/database operations
- Simple transformations and formatting
- Stateless operations

```typescript
// ✅ Functions for utilities
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

// ✅ Functions for API calls
export async function getCurrentWeather(location: string): Promise<CurrentWeather> {
  const apiKey = env.WEATHERAPI_KEY;
  if (!apiKey) {
    throw new Error('WeatherAPI key not configured');
  }

  const url = `http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${location}`;
  const response = await axios.get<WeatherApiCurrentResponse>(url);

  return {
    location: response.data.location.name,
    temp_c: response.data.current.temp_c,
    condition: response.data.current.condition.text,
  };
}

// ✅ Functions for repository operations
export async function createReminder(data: CreateReminderData): Promise<InsertOneResult<Reminder>> {
  const remindersCollection = getCollection();
  const reminder: Omit<Reminder, '_id'> = {
    chatId: data.chatId,
    message: data.message,
    remindAt: data.remindAt,
    status: 'pending',
    createdAt: new Date(),
  };
  return remindersCollection.insertOne(reminder as Reminder);
}
```

#### Use Classes For:
- Services with state management
- Controllers (Telegram bot handlers)
- Base/abstract classes for shared behavior
- When state management is required

```typescript
// ✅ Classes for services
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly aiService: AiService;

  constructor() {
    this.aiService = new AiService({
      model: ANTHROPIC_SONNET_MODEL,
      temperature: 0.7,
    });
  }

  async processMessage(message: string, chatId: number): Promise<ChatbotResponse> {
    try {
      const result = await this.aiService.invoke(message);
      return this.formatResponse(result);
    } catch (err) {
      this.logger.error(`Error processing message: ${err}`);
      throw err;
    }
  }
}

// ✅ Classes for stateful logic
export class BaseCache<T> {
  private cache: Record<string, CacheEntry<T>> = {};
  private readonly validForMs: number;

  constructor(validForMinutes: number) {
    this.validForMs = validForMinutes * 60 * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache[key];
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.validForMs) {
      delete this.cache[key];
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache[key] = {
      value,
      timestamp: Date.now(),
    };
  }
}

// ✅ Classes for controllers
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);
  private readonly bot: TelegramBot;

  constructor(private readonly chatbotService: ChatbotService) {
    this.bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });
  }

  init(): void {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.bot.on('message', (msg) => this.handleMessage(msg));
  }

  private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    // Handle message
  }
}
```

### 3. Readonly Properties

Use `readonly` extensively in type definitions to enforce immutability:

```typescript
export type HourlyWeather = {
  readonly time: string;
  readonly hour: number;
  readonly temp_c: number;
  readonly condition: string;
  readonly conditionCode: number;
  readonly chanceOfRain: number;
};

export type Reminder = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly message: string;
  readonly remindAt: Date;
  readonly status: 'pending' | 'sent' | 'failed';
  readonly createdAt: Date;
  readonly sentAt?: Date;
};
```

---

## Naming Conventions

### Files
- **Kebab-case** for all files: `chatbot-scheduler.service.ts`, `get-chat-completion.ts`
- **Suffixes**:
  - `.service.ts` - Service classes
  - `.controller.ts` - Controller classes (Telegram bot handlers)
  - `.init.ts` - Initialization files with manual dependency injection
  - `.config.ts` - Configuration files
  - `.spec.ts` - Test files
- **Special names**:
  - `types.ts` - Type definitions (NOT `interfaces.ts` or `.types.ts`)
  - `constants.ts` - Constants
  - `index.ts` - Barrel exports

### Variables & Functions
- **camelCase**: `chatbotService`, `getUserByUsername`, `getTomorrowHourlyForecast`
- Descriptive names that clearly indicate purpose
- Function names should be verbs or verb phrases

```typescript
// ✅ Good variable names
const weatherData = await getCurrentWeather(location);
const isValidDate = checkDateValidity(date);
const formattedNumber = formatNumber(1234567);

// ✅ Good function names
function getUserByUsername(username: string): Promise<User | null>
async function createReminder(data: CreateReminderData): Promise<InsertOneResult>
function formatAgentResponse(result: AgentResult): ChatbotResponse
```

### Constants
- **SCREAMING_SNAKE_CASE** for constants: `BOT_CONFIG`, `MAX_NUM_OF_SUBSCRIPTIONS_PER_USER`, `DEFAULT_TIMEZONE`

```typescript
export const ANTHROPIC_SONNET_MODEL = 'claude-sonnet-4-20250514';
export const DEFAULT_TIMEZONE = 'Asia/Jerusalem';
export const MAX_RETRIES = 3;

export const BOT_CONFIG = {
  name: 'Chatbot',
  commands: [
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Show help message' },
  ],
};
```

### Types
- **PascalCase**: `TwitterUser`, `CurrentWeather`, `ChatbotResponse`
- Descriptive names, often with context
- For create/update operations: `CreateReminderData`, `UpdateReminderData`

```typescript
export type TwitterUser = { /* ... */ };
export type CurrentWeather = { /* ... */ };
export type CreateReminderData = { /* ... */ };
export type UpdateUserData = { /* ... */ };
```

### Classes
- **PascalCase**: `ChatbotService`, `BaseCache`, `MessageLoader`
- Service suffix for service classes: `ChatbotService`, `WeatherService`
- Controller suffix for controller classes: `ChatbotController`
- Scheduler suffix for scheduler classes: `ChatbotSchedulerService`

---

## Import/Export Patterns

### Import Order

**Imports are automatically sorted by Prettier plugin in this order:**

1. Third-party modules
2. `@core/*` imports
3. `@decorators/*` imports
4. `@features/*` imports
5. `@services/*` imports
6. `@shared/*` imports
7. Relative imports (`./`, `../`)

```typescript
// ✅ Correct import order (auto-sorted by Prettier)
import { ChatAnthropic } from '@langchain/anthropic';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { DEFAULT_TIMEZONE } from '@core/config/main.config';
import { ANTHROPIC_OPUS_MODEL } from '@services/anthropic/constants';
import { ToolCallbackOptions } from '@shared/ai';
import { agent } from './agent';
import { BOT_CONFIG } from './chatbot.config';
```

### Type Imports

Use `import type` for type-only imports:

```typescript
import type { ObjectId } from 'mongodb';
import type { TelegramBot } from 'node-telegram-bot-api';
```

### Export Patterns

#### Barrel Exports (index.ts)

Every directory should have an `index.ts` file for clean exports:

```typescript
// ✅ Most common pattern - export everything
export * from './types';
export * from './utils';

// ✅ Selective exports
export { ChatbotModule } from './chatbot.module';
export { ChatbotService } from './chatbot.service';
export { BOT_CONFIG } from './chatbot.config';

// ✅ Named exports from utils
export { deleteFile } from './delete-file';
export { formatNumber } from './format-number';
export { sleep } from './sleep';
```

#### Type Exports

```typescript
// ✅ Export types with 'type' keyword
export type { TomorrowForecast, HourlyWeather, CurrentWeather } from './types';

// ✅ Or export from types.ts
export type User = { /* ... */ };
export type CreateUserData = { /* ... */ };
```

### Named Exports Only

**NEVER use default exports. Always use named exports:**

```typescript
// ✅ CORRECT - Named exports
export function getCurrentWeather() { /* ... */ }
export class ChatbotService { /* ... */ }
export const BOT_CONFIG = { /* ... */ };

// ❌ WRONG - Default exports
export default function getCurrentWeather() { /* ... */ }
export default class ChatbotService { /* ... */ }
export default BOT_CONFIG;
```

---

## Async/Await Patterns

**CRITICAL: Always use async/await. NEVER use `.then()` chains.**

### Standard Async/Await

```typescript
// ✅ CORRECT - async/await
async function getUserByUsername(username: string): Promise<TwitterUser | null> {
  const url = `https://api.twitter.com/2/users/by/username/${username}`;
  const response = await axios.get<TwitterUserResponse>(url, {
    headers: { Authorization: `Bearer ${env.TWITTER_BEARER_TOKEN}` },
  });
  return response.data.data || null;
}

// ✅ CORRECT - multiple awaits
async function processMessage(message: string, chatId: number): Promise<ChatbotResponse> {
  const user = await getUserByChatId(chatId);
  const aiResponse = await this.aiService.invoke(message);
  const formatted = formatAgentResponse(aiResponse);
  return formatted;
}

// ❌ WRONG - .then() chains
function getUserByUsername(username: string): Promise<TwitterUser | null> {
  return axios.get(url).then(response => response.data.data || null);
}
```

### Parallel Operations with Promise.all

```typescript
// ✅ CORRECT - parallel operations
async function initializeConnections(): Promise<void> {
  await Promise.all([
    createMongoConnection('chatbot-db'),
    createMongoConnection('coach-db'),
  ]);
}

// ✅ CORRECT - with map
await Promise.all(
  mongoDbNames.map(async (mongoDbName) => createMongoConnection(mongoDbName))
);
```

### Inline Error Handling with .catch()

For non-critical operations, use inline `.catch()`:

```typescript
// ✅ CORRECT - inline catch for non-critical errors
await connectGithubMcp().catch((err) => {
  console.error(`Failed to connect: ${err}`);
});

// ✅ CORRECT - fallback in catch
await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' })
  .catch(() => {
    // Fallback without markdown if parsing fails
    this.bot.sendMessage(chatId, replyText);
  });
```

### Explicit Promise Return Types

Always explicitly type Promise returns:

```typescript
// ✅ CORRECT - explicit return type
async function getCurrentWeather(location: string): Promise<CurrentWeather> {
  // implementation
}

async function getUser(id: number): Promise<User | null> {
  // implementation
}

// ❌ WRONG - implicit return type
async function getCurrentWeather(location: string) {
  // implementation
}
```

---

## Error Handling

### 1. Validation with Throwing

Throw errors for validation failures:

```typescript
async function getForecastWeather(location: string, date: string): Promise<DayForecast> {
  const apiKey = env.WEATHERAPI_KEY;
  if (!apiKey) {
    throw new Error('WeatherAPI key not configured');
  }

  const targetDate = new Date(date);
  const today = new Date();
  const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    throw new Error('Forecast date must be today or in the future.');
  }

  if (diffDays > 14) {
    throw new Error('Weather forecast is only available up to 14 days in the future');
  }

  // Continue with implementation
}
```

### 2. Try-Catch in Services

Use try-catch blocks in service methods for graceful error handling:

```typescript
async processMessage(message: string, chatId: number): Promise<ChatbotResponse> {
  try {
    const result = await this.aiService.invoke(message);
    return formatAgentResponse(result);
  } catch (err) {
    this.logger.error(`Error processing message for chat ${chatId}: ${err}`);
    return {
      message: 'Sorry, an error occurred while processing your message.',
      toolResults: [],
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 3. Inline .catch() for Non-Critical Errors

Use inline `.catch()` for operations where failure is acceptable:

```typescript
// ✅ Fallback for Markdown parsing
await this.bot.sendMessage(chatId, replyText, { parse_mode: 'Markdown' })
  .catch(() => {
    this.bot.sendMessage(chatId, replyText);
  });

// ✅ Log and continue
await connectGithubMcp().catch((err) => console.error(err));
```

### 4. Logger Usage

Use the custom Logger class for debugging and error tracking:

```typescript
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  async processMessage(message: string): Promise<void> {
    this.logger.log(`Processing message: ${message}`);

    try {
      await this.doSomething();
    } catch (err) {
      this.logger.error(`Error: ${err}`);
      throw err;
    }

    this.logger.debug('Message processed successfully');
  }
}
```

**Logger methods:**
- `logger.log()` - General information
- `logger.error()` - Errors
- `logger.warn()` - Warnings
- `logger.debug()` - Debug information

---

## Documentation Style

**This codebase follows a minimal documentation approach:**

### No JSDoc Comments

Code should be self-documenting through descriptive names. JSDoc is NOT used:

```typescript
// ✅ CORRECT - No JSDoc, self-documenting
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

// ❌ WRONG - Don't add JSDoc
/**
 * Formats a number with K or M suffix
 * @param num - The number to format
 * @returns Formatted string
 */
export function formatNumber(num: number): string {
  // ...
}
```

### Sparse Inline Comments

Use inline comments only when necessary for:
- Format specifications
- Complex logic explanations
- Important clarifications

```typescript
// ✅ Format specification
export type HourlyWeather = {
  readonly time: string; // Format: "YYYY-MM-DD HH:MM"
  readonly hour: number; // Hour number (0-23)
  readonly temp_c: number;
};

// ✅ Configuration explanation
// The order of this array is important - it determines the order of multiple results
export const CITIES_SLUGS_SUPPORTED = ['tel-aviv', 'haifa'];

// ✅ Complex logic clarification
// Check if date is within the 14-day forecast window
const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
```

---

## Testing Patterns

### Jest with Describe/Test Blocks

```typescript
describe('formatNumber()', () => {
  test.each([
    { num: 0, expected: '0' },
    { num: 999, expected: '999' },
    { num: 1000, expected: '1.0K' },
    { num: 1500, expected: '1.5K' },
    { num: 1000000, expected: '1.0M' },
    { num: 2500000, expected: '2.5M' },
  ])('should return $expected when num is $num', ({ num, expected }) => {
    expect(formatNumber(num)).toEqual(expected);
  });
});

describe('hasHebrew()', () => {
  it('should return false for empty string', () => {
    const actualResult = hasHebrew('');
    expect(actualResult).toEqual(false);
  });

  it('should return true if text is in hebrew', () => {
    const actualResult = hasHebrew('שלום');
    expect(actualResult).toEqual(true);
  });

  it('should return false if text is in english', () => {
    const actualResult = hasHebrew('hello');
    expect(actualResult).toEqual(false);
  });
});
```

**Patterns:**
- Test files: `*.spec.ts` alongside source files
- Use `describe()` for grouping related tests
- Use `test.each()` for parameterized tests
- Use `it()` for individual test cases
- Explicit test names: `'should return X when Y'` or `'should do X if Y'`
- Use `.toEqual()` for assertions

---

## Architecture Patterns

### 1. Manual Dependency Injection with Init Functions

Each bot/feature has an initialization function with manual dependency injection:

```typescript
// features/chatbot/chatbot.init.ts
export async function initChatbot(): Promise<void> {
  // Connect to required databases
  const mongoDbNames = [TRAINER_DB_NAME, COACH_DB_NAME, COOKER_DB_NAME];
  await Promise.all([
    ...mongoDbNames.map(async (mongoDbName) => createMongoConnection(mongoDbName)),
    connectGithubMcp().catch((err) => {
      console.error(`Failed to connect to GitHub MCP: ${err}`);
    }),
  ]);

  // Manual dependency injection - instantiate in correct order
  const chatbotService = new ChatbotService();
  const chatbotController = new ChatbotController(chatbotService);
  const chatbotScheduler = new ChatbotSchedulerService(chatbotService);

  // Initialize controller and scheduler
  chatbotController.init();
  chatbotScheduler.init();
}
```

**Main.ts with conditional loading:**

```typescript
async function bootstrap() {
  const logger = new Logger('main.ts');
  logger.log(`NODE_VERSION: ${process.versions.node}`);

  const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;

  if (shouldInitBot(chatbotBotConfig)) {
    await initChatbot();
    logger.log(`${chatbotBotConfig.name} initialized`);
  }

  if (shouldInitBot(coachBotConfig)) {
    await initCoach();
    logger.log(`${coachBotConfig.name} initialized`);
  }

  logger.log('MMPS service is running');
}

bootstrap();
```

### 2. Repository Pattern

Database operations in separate repository files using functions (not classes):

```typescript
// features/reminders/mongo/reminders.repository.ts

function getCollection(): Collection<Reminder> {
  return getMongoCollection<Reminder>('chatbot-db', 'reminders');
}

export async function createReminder(data: CreateReminderData): Promise<InsertOneResult<Reminder>> {
  const remindersCollection = getCollection();
  const reminder: Omit<Reminder, '_id'> = {
    chatId: data.chatId,
    message: data.message,
    remindAt: data.remindAt,
    status: 'pending',
    createdAt: new Date(),
  };
  return remindersCollection.insertOne(reminder as Reminder);
}

export async function getReminders(chatId: number): Promise<Reminder[]> {
  const remindersCollection = getCollection();
  return remindersCollection.find({ chatId }).toArray();
}

export async function updateReminderStatus(
  reminderId: ObjectId,
  status: Reminder['status']
): Promise<UpdateResult> {
  const remindersCollection = getCollection();
  return remindersCollection.updateOne(
    { _id: reminderId },
    { $set: { status, sentAt: new Date() } }
  );
}
```

### 3. Configuration Pattern

Each feature has a `BOT_CONFIG` constant:

```typescript
export const BOT_CONFIG = {
  name: 'Chatbot',
  commands: [
    { command: 'start', description: 'Start chatting with the bot' },
    { command: 'help', description: 'Show available commands' },
    { command: 'clear', description: 'Clear conversation history' },
  ],
};
```

### 4. Cron Scheduler Pattern

Scheduler services use `node-cron` for periodic tasks:

```typescript
import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';

export class ChatbotSchedulerService {
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  constructor(private readonly chatbotService: ChatbotService) {}

  init(): void {
    // Daily summary at 23:00
    cron.schedule(
      `00 23 * * *`,
      async () => {
        await this.handleDailySummary();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    // Football update at 12:59 and 23:59
    cron.schedule(
      `59 12,23 * * *`,
      async () => {
        await this.handleFootballUpdate();
      },
      { timezone: DEFAULT_TIMEZONE }
    );

    // Exercise reminder every day at 19:00
    cron.schedule(
      `0 19 * * *`,
      async () => {
        await this.handleExerciseReminder();
      },
      { timezone: DEFAULT_TIMEZONE }
    );
  }

  private async handleDailySummary(): Promise<void> {
    await dailySummary(this.bot, this.chatbotService);
  }

  private async handleFootballUpdate(): Promise<void> {
    await footballUpdate(this.bot, this.chatbotService);
  }

  private async handleExerciseReminder(): Promise<void> {
    await exerciseReminder(this.bot, this.chatbotService);
  }
}
```

### 5. Service Layer Architecture

**Controller → Service → Repository/External API**

```typescript
// Controller handles Telegram bot interactions
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  init(): void {
    this.registerHandlers();
  }

  private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    const response = await this.chatbotService.processMessage(msg.text, msg.chat.id);
    await this.bot.sendMessage(msg.chat.id, response.message);
  }
}

// Service contains business logic
export class ChatbotService {
  async processMessage(message: string, chatId: number): Promise<ChatbotResponse> {
    const user = await getUserByChatId(chatId); // Repository call
    const aiResponse = await this.aiService.invoke(message); // External API
    return this.formatResponse(aiResponse);
  }
}
```

### 6. Barrel Exports Pattern

Every directory has an `index.ts` for clean imports:

```typescript
// features/chatbot/index.ts
export { initChatbot } from './chatbot.init';
export { BOT_CONFIG } from './chatbot.config';
export * from './types';

// Enables clean imports:
import { initChatbot, BOT_CONFIG } from '@features/chatbot';
```

### 7. Caching Pattern

Base cache class for inheritance:

```typescript
export class BaseCache<T> {
  private cache: Record<string, CacheEntry<T>> = {};
  private readonly validForMs: number;

  constructor(validForMinutes: number) {
    this.validForMs = validForMinutes * 60 * 1000;
  }

  get(key: string): T | null {
    const entry = this.cache[key];
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.validForMs) {
      delete this.cache[key];
      return null;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache[key] = { value, timestamp: Date.now() };
  }
}
```

### 8. LangGraph Agent Architecture

AI agents use LangGraph with a factory pattern and descriptor objects:

**Agent Descriptor Pattern:**

```typescript
// types.ts
export type AgentDescriptor = {
  readonly name: string;
  readonly prompt: string;
  readonly description: string;
  readonly tools: StructuredTool[];
};

// agent.ts - Define the agent configuration
export function agent(): AgentDescriptor {
  const tools = [weatherTool, reminderTool, calendarTool];

  return {
    name: 'CHATBOT',
    prompt: `You are a helpful AI assistant...`,
    description: 'A helpful AI assistant with access to various tools',
    tools,
  };
}
```

**Agent Factory Pattern:**

```typescript
// factory.ts
import { MemorySaver } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { ToolCallbackHandler } from '@shared/ai';

export function createAgentService(
  descriptor: AgentDescriptor,
  opts: CreateAgentOptions
): AiService {
  const { name, tools = [] } = descriptor;
  const { model, checkpointer = new MemorySaver(), toolCallbackOptions } = opts;
  const callbacks = toolCallbackOptions ? [new ToolCallbackHandler(toolCallbackOptions)] : undefined;
  const reactAgent = createAgent({ model, tools, systemPrompt: descriptor.prompt, checkpointer });
  return new AiService(reactAgent.graph, { name, callbacks });
}
```

**Usage in Service:**

```typescript
// chatbot.service.ts
export class ChatbotService {
  private readonly aiService: AiService;

  constructor() {
    this.aiService = createAgentService(agent(), {
      model: new ChatAnthropic({ model: ANTHROPIC_SONNET_MODEL }),
      toolCallbackOptions: { enableLogging: true },
    });
  }

  async processMessage(message: string, chatId: number): Promise<ChatbotResponse> {
    const threadId = `chat-${chatId}`; // Thread-based conversation history
    const result = await this.aiService.invoke(message, { threadId });
    return formatAgentResponse(result);
  }
}
```

### 9. MessageLoader Pattern

Loading indicator for Telegram while processing long-running AI operations:

```typescript
import { MessageLoader } from '@services/telegram';

export class MessageLoader {
  constructor(
    bot: TelegramBot,
    botToken: string,
    chatId: number,
    messageId: number,
    options: MessageLoaderOptions
  ) {}

  async handleMessageWithLoader(action: () => Promise<void>): Promise<void> {
    // Shows reaction emoji immediately
    // Shows "typing..." action
    // After 3 seconds, shows loader message if action not complete
    // After 15 seconds, auto-deletes loader message
    // Cleans up when action completes
  }
}

// Usage in controller
const loader = new MessageLoader(this.bot, this.botToken, chatId, messageId, {
  loaderMessage: 'Processing your request...',
  reactionEmoji: '👀',
  loadingAction: BOT_BROADCAST_ACTIONS.TYPING,
});

await loader.handleMessageWithLoader(async () => {
  const response = await this.chatbotService.processMessage(text, chatId);
  await this.bot.sendMessage(chatId, response.message);
});
```

### 10. ToolCallbackHandler Pattern

Custom LangChain callback handler for monitoring tool execution:

```typescript
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';

export type ToolCallbackOptions = {
  onToolStart?: (toolName: string, input: any, metadata?: Record<string, unknown>) => void | Promise<void>;
  onToolEnd?: (toolName: string, output: any, metadata?: Record<string, unknown>) => void | Promise<void>;
  onToolError?: (toolName: string, error: Error, metadata?: Record<string, unknown>) => void | Promise<void>;
  enableLogging?: boolean;
};

export class ToolCallbackHandler extends BaseCallbackHandler {
  name = 'ToolCallbackHandler';

  async handleToolStart(tool, input, runId, parentRunId, tags, metadata, runName): Promise<void> {
    // Log tool start, track timing
  }

  async handleToolEnd(output, runId, parentRunId, tags): Promise<void> {
    // Log completion, calculate duration
  }

  async handleToolError(error, runId, parentRunId, tags): Promise<void> {
    // Log errors with context
  }
}
```

### 11. MCP (Model Context Protocol) Integration

External tool integration using MCP SDK:

```typescript
// shared/ai/mcp/github-mcp-client.ts
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

export function getMcpClient(): Client | null {
  return mcpClient;
}
```

**Usage in init:**

```typescript
// chatbot.init.ts
export async function initChatbot(): Promise<void> {
  await Promise.all([
    createMongoConnection('chatbot-db'),
    connectGithubMcp().catch((err) => {
      console.error(`Failed to connect to GitHub MCP: ${err}`);
    }),
  ]);
  // ... rest of initialization
}
```

### 12. AI Tool Pattern with Zod

LangChain tools are created using Zod schemas for input validation:

```typescript
// shared/ai/tools/weather/weather.tool.ts
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// Define schema with Zod
const schema = z.object({
  action: z
    .enum(['current', 'forecast', 'tomorrow_hourly'])
    .describe('Action to perform'),
  location: z.string().describe('The city or location'),
  date: z.string().optional().describe('Date in YYYY-MM-DD format'),
});

// Runner function with inferred types
async function runner({ action, location, date }: z.infer<typeof schema>) {
  switch (action) {
    case 'current': {
      const weather = await getCurrentWeather(location);
      return { action: 'current', location: weather.location, temperature: `${weather.temperature}°C` };
    }
    case 'forecast': {
      if (!date) throw new Error('Date parameter is required for forecast action');
      const forecast = await getForecastWeather(location, date);
      return { action: 'forecast', location: forecast.location, date: forecast.date };
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// Export the tool
export const weatherTool = tool(runner, {
  name: 'weather',
  description: 'Get weather information for a location',
  schema,
});
```

**Tool Directory Structure:**

```
shared/ai/tools/
├── weather/
│   └── weather.tool.ts
├── reminders/
│   ├── reminder.tool.ts
│   └── utils/
│       ├── create-reminder.ts
│       ├── list-reminders.ts
│       └── index.ts
├── polymarket/
│   ├── polymarket.tool.ts
│   └── utils/
│       ├── handle-subscribe.ts
│       ├── handle-trending.ts
│       └── index.ts
└── index.ts              # Barrel exports all tools
```

**Tool Patterns:**
- Use Zod for schema definition with `.describe()` for LLM context
- Use `z.infer<typeof schema>` for type-safe runner functions
- Support multiple actions via `z.enum()` pattern
- Organize complex tools with `utils/` subdirectory
- Export individual tools and re-export from `index.ts`

---

## MongoDB Patterns

### Connection Management

```typescript
const connections: Map<string, Db> = new Map();

export async function createMongoConnection(dbName: string): Promise<void> {
  const mongoUri = env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  connections.set(dbName, db);
  console.log(`Connected to MongoDB database: ${dbName}`);
}

export function getMongoDb(dbName: string): Db {
  const db = connections.get(dbName);
  if (!db) {
    throw new Error(`MongoDB connection for "${dbName}" not found`);
  }
  return db;
}
```

### Collection Access with Generics

```typescript
export function getMongoCollection<T = any>(
  dbName: string,
  collectionName: string
): Collection<T> {
  const db = getMongoDb(dbName);
  return db.collection<T>(collectionName);
}

// Usage
const usersCollection = getMongoCollection<User>('chatbot-db', 'users');
```

### Repository Functions

```typescript
function getCollection(): Collection<Reminder> {
  return getMongoCollection<Reminder>('chatbot-db', 'reminders');
}

export async function createReminder(data: CreateReminderData): Promise<InsertOneResult<Reminder>> {
  const remindersCollection = getCollection();
  const reminder: Omit<Reminder, '_id'> = {
    chatId: data.chatId,
    message: data.message,
    remindAt: data.remindAt,
    status: 'pending',
    createdAt: new Date(),
  };
  return remindersCollection.insertOne(reminder as Reminder);
}

export async function updateReminder(
  reminderId: ObjectId,
  data: UpdateReminderData
): Promise<UpdateResult> {
  const remindersCollection = getCollection();
  return remindersCollection.updateOne(
    { _id: reminderId },
    { $set: { ...data, updatedAt: new Date() } }
  );
}

export async function deleteReminder(reminderId: ObjectId): Promise<DeleteResult> {
  const remindersCollection = getCollection();
  return remindersCollection.deleteOne({ _id: reminderId });
}
```

---

## Notable Conventions

### 1. Readonly Properties
Extensive use of `readonly` in type definitions for immutability

### 2. Environment Variables
Always access via `env` from `node:process`:
```typescript
import { env } from 'node:process';

const apiKey = env.WEATHERAPI_KEY;
const botToken = env.TELEGRAM_BOT_TOKEN;
```

### 3. Date Handling
- Use `date-fns` for date operations
- Use `date-fns-tz` for timezone operations
- Default timezone: `Asia/Jerusalem`

```typescript
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const zonedDate = toZonedTime(new Date(), 'Asia/Jerusalem');
const formatted = format(zonedDate, 'yyyy-MM-dd HH:mm');
```

### 4. Long Lines
- 200 character line width (wider than typical 80/100)
- Configured in Prettier

### 5. Semicolons Required
Semicolons are required (enforced via Prettier with `"semi": true`)

### 6. Enum Usage
Mix of const objects and TypeScript enums:

```typescript
// ✅ Const object
export const ANTHROPIC_MODELS = {
  SONNET: 'claude-sonnet-4-20250514',
  OPUS: 'claude-opus-4-20250514',
} as const;

// ✅ TypeScript enum
export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}
```

### 7. Type Imports
Use `import type` for type-only imports to optimize bundle size

### 8. Generic Types
Used sparingly but effectively:
```typescript
BaseCache<T>
Collection<T>
Promise<T>
```

### 9. Utility Types
Use TypeScript utility types for derived types:
```typescript
Omit<Reminder, '_id'>
Pick<User, 'chatId' | 'username'>
Partial<UpdateUserData>
```

### 10. Path Aliases
Use path aliases instead of relative imports:
```typescript
// ✅ CORRECT
import { DEFAULT_TIMEZONE } from '@core/config/main.config';
import { ChatbotService } from '@features/chatbot';
import { getCurrentWeather } from '@services/weather';

// ❌ WRONG
import { DEFAULT_TIMEZONE } from '../../../core/config/main.config';
```

---

## Do's and Don'ts

### ✅ DO:

1. **Use `type` keyword exclusively** - NEVER use `interface`
2. **Mark types as `readonly`** for immutability
3. **Use functions for utilities** and stateless operations
4. **Use classes for services and controllers** with state management
5. **Export via barrel `index.ts` files** in every directory
6. **Use async/await** exclusively (NEVER `.then()` chains)
7. **Keep functions small and focused** - single responsibility
8. **Use descriptive, self-documenting names** for variables and functions
9. **Apply try-catch for critical error paths** in service methods
10. **Use inline `.catch()` for non-critical errors**
11. **Use Logger for debugging/errors** in services
12. **Return explicit Promise types** - always type async function returns
13. **Use named exports only** - NEVER default exports
14. **Use path aliases** (`@core/*`, `@features/*`, etc.)
15. **Validate inputs and throw errors** for invalid data
16. **Use repository functions** (not classes) for database operations
17. **Follow the init function pattern** for new features
18. **Use `import type`** for type-only imports
19. **Use `env` from `node:process`** for environment variables
20. **Use `date-fns` and `date-fns-tz`** for date operations
21. **Use `node-cron`** for scheduled tasks with timezone support
22. **Create `init()` methods** in controllers and schedulers for setup
23. **Use Zod schemas for AI tool input validation** with `.describe()` for LLM context
24. **Use the Agent Descriptor pattern** for new AI agents
25. **Use MessageLoader** for long-running Telegram operations
26. **Use ToolCallbackHandler** for monitoring AI tool execution
27. **Use semicolons** (enforced by Prettier)

### ❌ DON'T:

1. **Use interfaces** - this codebase uses `type` exclusively
2. **Use JSDoc comments** - code should be self-documenting
3. **Chain promises with `.then()`** - always use async/await
4. **Create deep nesting** - extract into separate functions
5. **Use strict TypeScript settings** - this project has them disabled
6. **Use default exports** - always use named exports
7. **Write long functions** - break them down
8. **Use relative imports for shared code** - use path aliases
9. **Create repository classes** - use functions instead
10. **Skip error handling** - always handle errors appropriately
11. **Forget to log errors** - use Logger in services
12. **Use `.then()/.catch()` chains** except for inline error handling
13. **Create files without barrel exports** - always add `index.ts`
14. **Use magic numbers** - extract to named constants
15. **Mix concerns in controllers** - delegate to services
16. **Create files without types** - always create `types.ts` if needed
17. **Use `any` without consideration** - although warned by ESLint, prefer specific types when possible
18. **Skip validation** - validate inputs and throw descriptive errors
19. **Create overly complex types** - keep them simple and readable
20. **Forget about immutability** - use `readonly` in types
21. **Omit semicolons** - they are required by Prettier config
22. **Create AI tools without Zod schemas** - always use Zod for type-safe tool inputs

---

## Quick Reference Checklist

When creating new code, ask yourself:

**General Code Style:**
- [ ] Am I using `type` instead of `interface`?
- [ ] Are my type properties marked as `readonly`?
- [ ] Am I using functions for utilities and classes for services?
- [ ] Are my file names in kebab-case?
- [ ] Am I using semicolons? (required by Prettier)

**File Organization:**
- [ ] Do I have a `types.ts` file for type definitions?
- [ ] Do I have an `index.ts` file with barrel exports?
- [ ] Do I have an `init.ts` file for feature initialization?
- [ ] Am I using path aliases (`@core/*`, `@features/*`, `@shared/*`)?
- [ ] Am I using named exports (not default exports)?

**Async & Error Handling:**
- [ ] Am I using async/await instead of `.then()` chains?
- [ ] Are my Promise return types explicitly typed?
- [ ] Am I using try-catch in service methods?
- [ ] Am I using inline `.catch()` for non-critical errors?
- [ ] Am I using Logger for errors and debugging?
- [ ] Am I validating inputs and throwing descriptive errors?

**Features & Architecture:**
- [ ] Do controllers and schedulers have `init()` methods?
- [ ] Am I following the repository pattern for DB operations?
- [ ] Am I using `env` from `node:process` for environment variables?
- [ ] Am I using `node-cron` with timezone for scheduled tasks?

**AI Tools (if applicable):**
- [ ] Am I using Zod for tool input schema definition?
- [ ] Do my Zod fields have `.describe()` for LLM context?
- [ ] Am I using the Agent Descriptor pattern for new agents?
- [ ] Am I using ToolCallbackHandler for monitoring?

**Telegram Features (if applicable):**
- [ ] Am I using MessageLoader for long-running operations?
- [ ] Am I handling Markdown parsing fallbacks?

**Code Quality:**
- [ ] Is my code self-documenting (no JSDoc needed)?
- [ ] Am I avoiding `any` where possible? (ESLint warns on this)

---

## Project-Specific Patterns

### Telegram Bot Focus
Most features are Telegram bot controllers with specific patterns for handling messages, commands, and callbacks.

### Multi-Bot System
Conditional bot loading based on `LOCAL_ACTIVE_BOT_ID` environment variable allows running individual bots in development.

### Current Features (7 bots)
- **chatbot** - Main AI assistant with extensive tool integrations (weather, reminders, calendar, Gmail, sports, recipes, Polymarket, YouTube follower, exercise tracking, etc.)
- **coach** - Fitness/wellness coaching bot
- **langly** - Language learning bot
- **magister** - Academic/education bot
- **wolt** - Food delivery tracking bot
- **worldly** - Game statistics bot
- **striker** - Minimal utility feature

### AI Integration
Heavy use of LangChain, LangGraph with MemorySaver, Anthropic Claude, and OpenAI models:
- **Agent Pattern**: Descriptor-based configuration with factory functions
- **Tool System**: 20+ AI tools in `shared/ai/tools/` covering weather, sports, maps, audio, image, reminders, calendar, email, recipes, crypto, stocks, Polymarket, YouTube, and more
- **MCP Integration**: Model Context Protocol for external tool connections (GitHub)
- **Callback Handlers**: Custom ToolCallbackHandler for logging and monitoring

### External Services (30+ integrations)
Weather, earthquake monitoring, sports data (scores-365), Google services (calendar, Gmail, translate, sheets), OpenAI, Anthropic, Twitter, TikTok, YouTube, Spotify, Polymarket, Twilio, Pinecone, and more.

### Shared Business Logic
Located in `shared/` directory:
- **ai/** - AI tools, MCP clients, callback handlers
- **polymarket-follower/** - Prediction market subscription tracking
- **youtube-follower/** - YouTube channel subscription management
- **reminders/** - Smart reminder system
- **preferences/** - User preferences storage
- **trainer/** - Exercise tracking
- **cooker/** - Recipe management
- **sports/** - Sports data utilities

### Scheduler Services
Many features have separate scheduler services using `node-cron` for periodic tasks:
- Daily summaries at specific times
- Polymarket price updates
- YouTube video notifications
- Exercise reminders
- Football match updates
Each scheduler has an `init()` method that registers all cron jobs with timezone support.

### Message Loaders
Custom `MessageLoader` pattern for showing loading states in Telegram while processing AI requests:
- Immediate reaction emoji feedback
- "Typing..." indicator
- Delayed loader message (after 3 seconds)
- Auto-cleanup (after 15 seconds)

### Bilingual Support
Mix of Hebrew and English in configuration and messages, with utilities to detect Hebrew text.

---

## Summary

This codebase follows a **pragmatic, readable style** with consistent patterns across all modules. The focus is on:

- **Developer velocity** through clear conventions
- **Type safety** through extensive use of TypeScript types (not interfaces) and Zod schemas for AI tools
- **Immutability** through `readonly` properties
- **Simplicity** through functional programming for utilities and manual dependency injection
- **Modularity** through feature-based architecture with init functions
- **Maintainability** through self-documenting code
- **Consistency** through automated formatting (Prettier with semicolons) and linting (ESLint flat config)
- **No framework overhead** - plain TypeScript with node-cron for scheduling
- **AI-First Design** - LangGraph agents with MemorySaver, 20+ tools, and MCP integrations

**Key Technologies:**
- Node.js 24.x, TypeScript 5.9.x (ES2022 target)
- LangChain/LangGraph for AI agents
- MongoDB for persistence
- Telegram Bot API for user interaction
- Zod for schema validation

When in doubt, look at existing code in the `features/` or `services/` directories for examples that match these patterns.
