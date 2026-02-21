# Naming Conventions

Standard naming conventions across MMPS codebase.

## Files

### Naming Pattern

Use **kebab-case** with appropriate suffixes:

| Type | Pattern | Example |
|------|---------|---------|
| Service files | `{name}.service.ts` | `chatbot.service.ts` |
| Controller files | `{name}.controller.ts` | `chatbot.controller.ts` |
| Initialization | `{name}.init.ts` | `chatbot.init.ts` |
| Configuration | `{name}.config.ts` | `chatbot.config.ts` |
| Schedulers | `{name}-scheduler.service.ts` | `chatbot-scheduler.service.ts` |
| Tests | `{name}.spec.ts` | `chatbot.service.spec.ts` |
| Types | `types.ts` | Always this name |
| Barrel exports | `index.ts` | Always this name |
| Utilities | `{name}.util.ts` or `{name}.utils.ts` | `string.utils.ts` |

### Directory Names

Use **kebab-case**:

```
features/
  ├── chatbot/        # ✅ CORRECT
  ├── coach/          # ✅ CORRECT
  └── my_bot/         # ❌ WRONG - use my-bot

services/
  ├── telegram-grammy/    # ✅ CORRECT
  ├── openai/             # ✅ CORRECT
  └── googleServices/     # ❌ WRONG - use google-services
```

## Variables and Functions

### camelCase

```typescript
// ✅ CORRECT
const botToken = env.CHATBOT_TELEGRAM_BOT_TOKEN;
const telegramUserId = 123456;

function getUserByUsername(username: string): User | null {
  // ...
}

const parseWeatherData = (data: RawWeatherData): WeatherData => {
  // ...
};

// ❌ WRONG
const BotToken = env.CHATBOT_TELEGRAM_BOT_TOKEN;
const telegram_user_id = 123456;
const GetUserByUsername = (username: string) => { };
```

### Function Names

Start with a verb for clarity:

```typescript
// ✅ CORRECT
export async function createReminder(data: CreateReminderData): Promise<void> {}
export async function updateReminderStatus(id: ObjectId, status: string): Promise<void> {}
export function getReminders(chatId: number): Promise<Reminder[]> {}
export function isValidEmail(email: string): boolean {}
export async function sendMessage(chatId: number, text: string): Promise<void> {}

// ❌ AVOID
export async function reminderCreate(data: CreateReminderData): Promise<void> {}
export async function reminderStatusUpdate(id: ObjectId, status: string): Promise<void> {}
export function reminders(chatId: number): Promise<Reminder[]> {}
export function validEmail(email: string): boolean {}
```

### Boolean Functions

Use is/has prefix:

```typescript
export function isAdmin(userId: number): boolean {}
export function hasPermission(userId: number, permission: string): boolean {}
export function isEmpty(value: string): boolean {}
```

## Constants

### SCREAMING_SNAKE_CASE

```typescript
// ✅ CORRECT
const DEFAULT_TIMEZONE = 'Asia/Jerusalem';
const MAX_RETRY_ATTEMPTS = 3;
const BOT_CONFIG = { /* ... */ };
const OPENAI_API_KEY = env.OPENAI_API_KEY;

// ❌ WRONG
const defaultTimezone = 'Asia/Jerusalem';  // Should be const
const max_retry_attempts = 3;              // Use SCREAMING_SNAKE_CASE
const botConfig = { /* ... */ };
```

### Where to Define Constants

```typescript
// Good: File-level constants
const DEFAULT_TIMEOUT_MS = 5000;

export async function callAPI(url: string): Promise<Response> {
  // Use constant
  return fetchWithTimeout(url, DEFAULT_TIMEOUT_MS);
}

// Better: In a constants.ts file
// services/openai/constants.ts
export const OPENAI_TIMEOUT_MS = 30000;
export const OPENAI_MAX_RETRIES = 3;
export const CHAT_COMPLETIONS_MINI_MODEL = 'gpt-4-mini';
```

## Types and Interfaces

### PascalCase

```typescript
// ✅ CORRECT
export type User = { /* ... */ };
export type CreateUserData = { /* ... */ };
export type ChatbotResponse = { /* ... */ };
export type WeatherApiResponse = { /* ... */ };

class ChatbotService {
  // ...
}

// ❌ WRONG
export type user = { /* ... */ };
export type create_user_data = { /* ... */ };
export type chatbot_response = { /* ... */ };
```

### Type Naming Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| `{Name}` | Basic type | `User`, `Message` |
| `{Name}Data` | Input data | `CreateUserData`, `UpdateReminderData` |
| `{Name}Response` | API response | `WeatherResponse`, `ChatbotResponse` |
| `{Name}Config` | Configuration | `TelegramBotConfig`, `OpenaiConfig` |
| `{Name}Options` | Function options | `TimeoutOptions`, `RetryOptions` |
| `Create{Name}` | Constructor input | `CreateReminderData` |
| `Get{Name}Result` | Function result | `GetWeatherResult` |

## Classes

### PascalCase with Suffix

```typescript
// ✅ CORRECT
export class ChatbotService {
  // Business logic
}

export class ChatbotController {
  // Telegram handlers
}

export class ChatbotSchedulerService {
  // Scheduled tasks
}

class Logger {
  // Utility class
}

// ❌ WRONG
export class Chatbot {          // Should have suffix
export class chatbotService {   // Should be PascalCase
export class chatbot_service {  // Should not have underscores
```

### Suffixes

- **Service**: For business logic classes - `ChatbotService`
- **Controller**: For event handlers - `ChatbotController`
- **Scheduler**: For scheduled tasks - `ChatbotSchedulerService`
- **Utility/Helper**: General helpers - `Logger`, `EmailValidator`

## Module Exports

### Named Exports

Always use named exports, organized by type:

```typescript
// ✅ CORRECT - Organized barrel exports
export { BOT_CONFIG } from './chatbot.config';
export { initChatbot } from './chatbot.init';
export { ChatbotService } from './chatbot.service';
export { ChatbotController } from './chatbot.controller';
export * from './types';

// ❌ AVOID
export default ChatbotService;  // Don't use default
export * from './chatbot.service';  // Too broad
```

## Environment Variables

### SCREAMING_SNAKE_CASE with Context

```bash
# ✅ CORRECT
OPENAI_API_KEY=sk-...
MONGO_URI=mongodb://...
CHATBOT_TELEGRAM_BOT_TOKEN=...
GOOGLE_SHEETS_SPREADSHEET_ID=...
IS_PROD=true

# ❌ AVOID
openai_api_key=sk-...           # Should be uppercase
mongoUri=mongodb://...          # Should be snake_case
CHATBOT_BOT_TOKEN=...           # Redundant "BOT" in name
```

## Branch and Commit Naming

### Branch Names

Use **kebab-case** with descriptive prefix:

```bash
feature/chatbot-reminders      # New feature
fix/weather-api-timeout         # Bug fix
docs/architecture-guide         # Documentation
refactor/service-layer          # Refactoring
```

### Commit Messages

Use imperative mood, descriptive but concise:

```bash
✅ CORRECT:
git commit -m "Add reminder scheduler to chatbot"
git commit -m "Fix MongoDB connection timeout"
git commit -m "Update documentation for bot setup"

❌ WRONG:
git commit -m "added reminders"           # Not imperative
git commit -m "Fixed"                     # Too vague
git commit -m "CHANGE WEATHER API"        # All caps
```

## Summary Table

| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case with suffix | `chatbot.service.ts` |
| Directories | kebab-case | `telegram-grammy/` |
| Variables | camelCase | `botToken` |
| Functions | camelCase, verb prefix | `getUserByUsername()` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_TIMEZONE` |
| Types | PascalCase | `ChatbotResponse` |
| Classes | PascalCase + Suffix | `ChatbotService` |
| Env Vars | SCREAMING_SNAKE_CASE | `OPENAI_API_KEY` |

## Next Steps

- [Code Style Guide](/architecture/code-style)
- [Architecture Patterns](/architecture/patterns)
- [Database Patterns](/architecture/database)
