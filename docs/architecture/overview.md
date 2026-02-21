# Architecture Overview

MMPS uses a **plain TypeScript architecture** with manual dependency injection and no framework overhead.

## Key Principles

- **No frameworks** - Direct Node.js and TypeScript
- **Manual DI** - Simple and explicit dependency injection
- **Modular design** - Each bot is independent
- **Type safety** - Full TypeScript with non-strict mode
- **Tested** - Jest 30.x for comprehensive testing

## Tech Stack

### Core
- **Node.js 24.x** - JavaScript runtime
- **TypeScript 5.9.x** - Type safety with ES2022 target
- **node-cron** - Scheduled tasks

### AI & LLM
- **Anthropic SDK** - Claude models
- **OpenAI** - ChatGPT models
- **LangChain** - AI orchestration
- **LangGraph** - Agentic workflows with MemorySaver

### Data & Persistence
- **MongoDB** - Native driver for data persistence
- **date-fns** & **date-fns-tz** - Date handling (default timezone: `Asia/Jerusalem`)

### Bot & Messaging
- **grammY** - Modern Telegram bot framework
- **Zod** - Schema validation

### Integration & Tools
- **MCP SDK** - Model Context Protocol for tool integration
- **Axios** - HTTP client
- **Google Cloud** - Google Sheets and other services

### Code Quality
- **ESLint 9.x** - Linting with flat config
- **Prettier** - Formatting (200 char line width, single quotes, trailing commas, semicolons)
- **Jest 30.x** - Testing framework with ts-jest

## Project Structure

```
src/
├── core/           # Core utilities, config, MongoDB setup
├── features/       # Bot implementations (6 independent bots)
├── services/       # External service integrations (30+ services)
├── shared/         # Shared utilities and AI tools
└── main.ts         # Entry point with conditional bot loading
```

### Feature Structure

Each bot follows a consistent pattern:

```
features/{bot-name}/
├── {name}.init.ts              # Initialization with manual DI
├── {name}.controller.ts        # Telegram handlers (grammY)
├── {name}.service.ts           # Business logic
├── {name}-scheduler.service.ts # Scheduled tasks (cron)
├── {name}.config.ts            # Bot configuration
├── types.ts                    # Type definitions
├── index.ts                    # Barrel exports
└── mongo/                      # Feature-specific repositories
```

### Available Bots

1. **Chatbot** - AI assistant with 20+ tools
2. **Coach** - Sports analytics and predictions
3. **Langly** - Language learning
4. **Magister** - Course management
5. **Wolt** - Restaurant notifications
6. **Worldly** - Geography education

## Conditional Bot Loading

In development, run one bot at a time:

```bash
LOCAL_ACTIVE_BOT_ID=chatbot npm run start:dev
```

In production, all bots run:

```bash
IS_PROD=true npm start
```

Logic in `main.ts`:

```typescript
const shouldInitBot = (config) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;
```

## Core Patterns

### 1. Manual Dependency Injection

Initialization functions set up services and controllers:

```typescript
// features/chatbot/chatbot.init.ts
export async function initChatbot(): Promise<void> {
  await Promise.all([
    createMongoConnection('chatbot-db'),
    connectGithubMcp().catch(console.error),
  ]);

  const chatbotService = new ChatbotService();
  const chatbotController = new ChatbotController(chatbotService);
  const chatbotScheduler = new ChatbotSchedulerService(chatbotService);

  chatbotController.init();
  chatbotScheduler.init();
}
```

### 2. Service Layer

**Controllers** handle Telegram interactions:

```typescript
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}
  init(): void { /* register grammY handlers */ }
}
```

**Services** contain business logic:

```typescript
export class ChatbotService {
  async processMessage(message: string): Promise<Response> {
    // Business logic
  }
}
```

**Repositories** handle database operations (functions, not classes):

```typescript
export async function createReminder(data: CreateReminderData): Promise<void> {
  return getCollection().insertOne({ ...data, createdAt: new Date() });
}
```

### 3. Scheduled Tasks

Using node-cron:

```typescript
export class ChatbotSchedulerService {
  init(): void {
    cron.schedule(`00 23 * * *`, () => this.handleDailySummary(), {
      timezone: 'Asia/Jerusalem',
    });
  }
}
```

### 4. Configuration

Each bot has a config file:

```typescript
export const BOT_CONFIG: TelegramBotConfig = {
  id: 'CHATBOT',
  name: 'Chatbot',
  token: 'CHATBOT_TELEGRAM_BOT_TOKEN',
  commands: { START: { command: '/start', description: 'Start' } },
};
```

## Data Flow

```
Telegram User
    ↓
Telegram API
    ↓
Bot Controller (grammY handler)
    ↓
Bot Service (business logic)
    ↓
Repository Functions (database operations)
    ↓
MongoDB
```

For AI features:

```
User Message
    ↓
ChatbotController
    ↓
ChatbotService
    ↓
AiService (LangGraph agent)
    ↓
Tools (weather, reminders, etc.)
    ↓
Response back to user
```

## Environment Configuration

- **Development**: `IS_PROD=false`, `LOCAL_ACTIVE_BOT_ID=chatbot`
- **Production**: `IS_PROD=true` (all bots run)
- **Google Sheets Logging**: Service account credentials for production logging

## Next Steps

- [Project Structure](/architecture/project-structure)
- [Code Style](/architecture/code-style)
- [Design Patterns](/architecture/patterns)
- [Database Patterns](/architecture/database)
