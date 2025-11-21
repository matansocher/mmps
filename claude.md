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
10. [Architecture Patterns](#architecture-patterns)
11. [MongoDB Patterns](#mongodb-patterns)
12. [Notable Conventions](#notable-conventions)
13. [Do's and Don'ts](#dos-and-donts)

---

## Tech Stack

### Core Framework
- **NestJS v10.0.0** - TypeScript framework for scalable server-side applications
- **Node.js 20.x**
- **TypeScript 5.1.3** with ES2021 target
- **Express** as HTTP server

### Key Dependencies
- **AI/LLM**: Anthropic SDK, OpenAI, Google Generative AI, Langchain, LangGraph
- **Database**: MongoDB with native driver
- **Bot Platform**: Telegram Bot API (node-telegram-bot-api)
- **Date Handling**: date-fns, date-fns-tz
- **Testing**: Jest with ts-jest
- **Code Quality**: ESLint, Prettier with import sorting plugin
- **Git Hooks**: Husky, Commitlint (conventional commits)
- **Release Management**: Semantic Release

### TypeScript Configuration
- **Non-strict mode** (strictNullChecks, noImplicitAny, strictBindCallApply all disabled)
- ESLint: `@typescript-eslint/no-explicit-any` turned OFF (any types allowed)
- ES2021 target with CommonJS modules

### Code Formatting
- **Prettier**: 200 character line width, single quotes, trailing commas
- **Path Aliases**: `@core/*`, `@features/*`, `@services/*`, `@shared/*`

---

## Project Structure

### Top-Level Organization

```
src/
├── core/           # Core utilities, config, mongo setup
├── features/       # Bot features (chatbot, coach, etc.)
├── services/       # External service integrations (openai, twitter, weather, etc.)
├── shared/         # Shared business logic used across features
├── main.ts         # Application entry point
└── app.module.ts   # Root module with conditional bot loading
```

### Feature Module Pattern

Each feature follows a consistent structure:

```
features/{name}/
├── {name}.module.ts              # NestJS module
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
- NestJS services (with `@Injectable()`)
- NestJS controllers (with `@Injectable()`)
- Base/abstract classes for shared behavior
- When state management is required

```typescript
// ✅ Classes for NestJS services
@Injectable()
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

// ✅ Classes for NestJS controllers
@Injectable()
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);
  private readonly bot: TelegramBot;

  constructor(private readonly chatbotService: ChatbotService) {
    this.bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });
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
  - `.service.ts` - NestJS services
  - `.controller.ts` - NestJS controllers
  - `.module.ts` - NestJS modules
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
- Service suffix for NestJS services: `ChatbotService`, `WeatherService`
- Controller suffix for NestJS controllers: `ChatbotController`

---

## Import/Export Patterns

### Import Order

**Imports are automatically sorted by Prettier plugin in this order:**

1. Third-party modules
2. `@nestjs/*` imports
3. `@core/*` imports
4. `@decorators/*` imports
5. `@features/*` imports
6. `@services/*` imports
7. `@shared/*` imports
8. Relative imports (`./`, `../`)

```typescript
// ✅ Correct import order (auto-sorted by Prettier)
import { ChatAnthropic } from '@langchain/anthropic';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { env } from 'node:process';
import { Injectable } from '@nestjs/common';
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
import type { NestExpressApplication } from '@nestjs/platform-express';
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

Use NestJS Logger for debugging and error tracking:

```typescript
@Injectable()
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

### 1. NestJS Module Architecture

Each bot/feature is a self-contained NestJS module:

```typescript
@Module({
  imports: [],
  controllers: [],
  providers: [ChatbotService, ChatbotController],
  exports: [ChatbotService],
})
export class ChatbotModule implements OnModuleInit {
  private readonly logger = new Logger(ChatbotModule.name);

  constructor(private readonly chatbotController: ChatbotController) {}

  async onModuleInit() {
    this.logger.log('ChatbotModule initialized');
  }
}
```

**Root module with conditional loading:**

```typescript
const activeModules = [];

if (env.LOCAL_ACTIVE_BOT_ID === 'chatbot' || !env.LOCAL_ACTIVE_BOT_ID) {
  activeModules.push(ChatbotModule);
}

if (env.LOCAL_ACTIVE_BOT_ID === 'coach' || !env.LOCAL_ACTIVE_BOT_ID) {
  activeModules.push(CoachModule);
}

@Module({
  imports: activeModules,
})
export class AppModule {}
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

### 4. Service Layer Architecture

**Controller → Service → Repository/External API**

```typescript
// Controller handles Telegram bot interactions
@Injectable()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    const response = await this.chatbotService.processMessage(msg.text, msg.chat.id);
    await this.bot.sendMessage(msg.chat.id, response.message);
  }
}

// Service contains business logic
@Injectable()
export class ChatbotService {
  async processMessage(message: string, chatId: number): Promise<ChatbotResponse> {
    const user = await getUserByChatId(chatId); // Repository call
    const aiResponse = await this.aiService.invoke(message); // External API
    return this.formatResponse(aiResponse);
  }
}
```

### 5. Barrel Exports Pattern

Every directory has an `index.ts` for clean imports:

```typescript
// features/chatbot/index.ts
export { ChatbotModule } from './chatbot.module';
export { ChatbotService } from './chatbot.service';
export { BOT_CONFIG } from './chatbot.config';
export * from './types';

// Enables clean imports:
import { ChatbotModule, BOT_CONFIG } from '@features/chatbot';
```

### 6. Caching Pattern

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

### 5. No Semicolons
Semicolons are omitted (automatic via Prettier)

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
4. **Use classes for NestJS services** and stateful logic
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
17. **Follow the feature module pattern** for new features
18. **Use `import type`** for type-only imports
19. **Use `env` from `node:process`** for environment variables
20. **Use `date-fns` and `date-fns-tz`** for date operations

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
17. **Use `any` without consideration** - although allowed, prefer specific types when possible
18. **Skip validation** - validate inputs and throw descriptive errors
19. **Create overly complex types** - keep them simple and readable
20. **Forget about immutability** - use `readonly` in types

---

## Quick Reference Checklist

When creating new code, ask yourself:

- [ ] Am I using `type` instead of `interface`?
- [ ] Are my type properties marked as `readonly`?
- [ ] Am I using functions for utilities and classes for services?
- [ ] Are my file names in kebab-case?
- [ ] Do I have a `types.ts` file for type definitions?
- [ ] Do I have an `index.ts` file for barrel exports?
- [ ] Am I using async/await instead of `.then()` chains?
- [ ] Are my Promise return types explicitly typed?
- [ ] Am I using named exports (not default exports)?
- [ ] Am I using path aliases (`@core/*`, `@features/*`)?
- [ ] Am I validating inputs and throwing descriptive errors?
- [ ] Am I using try-catch in service methods?
- [ ] Am I using Logger for errors and debugging?
- [ ] Is my code self-documenting (no JSDoc needed)?
- [ ] Am I following the repository pattern for DB operations?
- [ ] Am I using `env` from `node:process` for environment variables?

---

## Project-Specific Patterns

### Telegram Bot Focus
Most features are Telegram bot controllers with specific patterns for handling messages, commands, and callbacks.

### Multi-Bot System
Conditional bot loading based on `LOCAL_ACTIVE_BOT_ID` environment variable allows running individual bots in development.

### AI Integration
Heavy use of LangChain, Anthropic, and OpenAI for AI-powered features. Tool/plugin architecture for extensibility.

### Scheduler Services
Many features have separate scheduler services for periodic tasks (e.g., sending reminders, fetching updates).

### Message Loaders
Custom pattern for showing loading states in Telegram while processing AI requests.

### Bilingual Support
Mix of Hebrew and English in configuration and messages, with utilities to detect Hebrew text.

---

## Summary

This codebase follows a **pragmatic, readable style** with consistent patterns across all modules. The focus is on:

- **Developer velocity** through clear conventions
- **Type safety** through extensive use of TypeScript types (not interfaces)
- **Immutability** through `readonly` properties
- **Simplicity** through functional programming for utilities
- **Modularity** through NestJS architecture
- **Maintainability** through self-documenting code
- **Consistency** through automated formatting and linting

When in doubt, look at existing code in the `features/` or `services/` directories for examples that match these patterns.
