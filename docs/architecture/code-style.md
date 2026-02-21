# Code Style

MMPS follows strict code style guidelines to maintain consistency and readability.

## Types and Interfaces

### Use `type`, Never `interface`

**CRITICAL RULE**: Always use `type` keyword. NEVER use `interface`.

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

### Readonly Properties

Mark properties as `readonly` for immutability:

```typescript
export type BotConfig = {
  readonly id: string;
  readonly name: string;
  readonly token: string;
  readonly createdAt: Date;
};
```

### Utility Types

Use TypeScript utility types for flexibility:

```typescript
export type PartialUser = Partial<User>;
export type UserWithoutId = Omit<User, '_id'>;
export type ReadonlyUser = Readonly<User>;
```

## Functions vs Classes

### Functions For:
- Utility functions
- API calls
- Repository operations (database access)
- Stateless logic

```typescript
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createReminder(data: CreateReminderData): Promise<void> {
  const collection = getCollection();
  return collection.insertOne({ ...data, status: 'pending', createdAt: new Date() });
}
```

### Classes For:
- Services with state
- Controllers (Telegram handlers)
- Schedulers

```typescript
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly aiService: AiService;

  async processMessage(message: string, chatId: number): Promise<ChatbotResponse> {
    try {
      return await this.aiService.invoke(message);
    } catch (err) {
      this.logger.error(`Error: ${err}`);
      return { message: 'An error occurred' };
    }
  }
}
```

## Exports and Imports

### Named Exports Only

NEVER use default exports:

```typescript
// ✅ CORRECT
export { ChatbotService } from './chatbot.service';
export { BOT_CONFIG } from './chatbot.config';
export * from './types';

// ❌ WRONG
export default ChatbotService;
```

### Type Imports

Use `import type` for type-only imports:

```typescript
// ✅ CORRECT
import type { User } from '@shared/types';
import { createUser } from '@shared/database';

// ❌ WRONG
import { User } from '@shared/types';  // User is a type, not a value
```

### Import Organization

1. Third-party modules
2. Path aliases (`@core/*` → `@features/*` → `@services/*` → `@shared/*`)
3. Relative imports (`./`, `../`)

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { env } from 'node:process';

import { Logger } from '@core/utils';
import { initChatbot } from '@features/chatbot';
import { BOT_CONFIG } from './chatbot.config';
```

## Async & Await

### Always Use async/await

NEVER use `.then()` chains:

```typescript
// ✅ CORRECT
async function getUserByUsername(username: string): Promise<User | null> {
  const response = await axios.get<UserResponse>(url);
  return response.data.user || null;
}

// ❌ WRONG - Don't use .then()
function getUser(username: string) {
  return axios.get(url).then(r => r.data);
}
```

### Parallel Operations

Use `Promise.all()` for independent operations:

```typescript
await Promise.all([
  createMongoConnection('chatbot-db'),
  createMongoConnection('coach-db'),
  connectGithubMcp().catch((err) => console.error(err)),
]);
```

## Error Handling

### Validation Errors

Throw immediately for invalid input:

```typescript
if (!apiKey) throw new Error('API key not configured');
if (diffDays > 14) throw new Error('Forecast only available up to 14 days');
```

### Service Errors

Use try-catch with Logger in services:

```typescript
async processMessage(message: string): Promise<Response> {
  try {
    return await this.aiService.invoke(message);
  } catch (err) {
    this.logger.error(`Error processing message: ${err}`);
    return { message: 'An error occurred', toolResults: [] };
  }
}
```

### Optional Error Handling

Use inline `.catch()` for non-critical operations:

```typescript
await connectGithubMcp().catch((err) => console.error(err));

// Fallback without throwing
await sendMessage(chatId, text).catch(() => {
  console.warn('Failed to send message');
});
```

## Logging

Use the Logger class from `@core/utils`:

```typescript
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  async someMethod() {
    this.logger.log('Method started');
    this.logger.debug('Debug info');
    this.logger.warn('Warning message');
    this.logger.error('Error message');
  }
}
```

## Formatting

### Prettier Configuration

- **Line width**: 200 characters
- **Quotes**: Single quotes
- **Trailing commas**: Yes
- **Semicolons**: Required
- **Tab width**: 2 spaces

```typescript
// ✅ CORRECT
const message = 'Hello world';
const arr = [1, 2, 3,];
const obj = { name: 'John', age: 30 };

// ❌ WRONG
const message = "Hello world"
const arr = [1, 2, 3]
const obj = { name: 'John', age: 30, }
```

## Documentation

### No JSDoc

Code should be self-documenting. Only comment when needed:

```typescript
// ✅ CORRECT - Self-documenting function names
export async function createReminder(data: CreateReminderData): Promise<void> {
  // Only comment complex logic
  // Format: "YYYY-MM-DD HH:MM"
  const formattedTime = format(data.date, 'yyyy-MM-dd HH:mm');
}

// ❌ AVOID - Unnecessary JSDoc
/**
 * Creates a reminder
 * @param data The reminder data
 * @returns Promise
 */
export async function createReminder(data: CreateReminderData): Promise<void> {
}
```

### Comment When Needed

Use inline comments for:
- Format specifications: `readonly time: string; // Format: "YYYY-MM-DD HH:MM"`
- Complex logic explanations
- Important configuration notes

## Next Steps

- [Naming Conventions](/architecture/naming-conventions)
- [Architecture Patterns](/architecture/patterns)
- [Testing Guide](/development/testing)
