# Architecture Overview

MMPS uses a **plain TypeScript architecture** with manual dependency injection and no framework overhead.

## Key Principles

- **No frameworks** - Direct Node.js and TypeScript
- **Manual DI** - Simple and explicit dependency injection
- **Modular design** - Each bot is independent
- **Type safety** - Full TypeScript with non-strict mode
- **Tested** - Vitest 4.x for comprehensive testing

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
- **Vitest 4.x** - Testing framework (unit, integration, and bot E2E suites)

## Project Structure

```
src/
├── core/           # Core utilities, config, MongoDB setup
├── features/       # Bot implementations (8 independent bots)
├── services/       # External service integrations (30+ services)
├── shared/         # Shared utilities and AI tools
└── index.ts        # Entry point with conditional bot loading
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

1. **Chatbot** - AI assistant with 27 tools
2. **Chilli** - Cat persona bot (Hebrew)
3. **Coach** - Sports analytics and predictions
4. **Wolt** - Restaurant notifications
5. **Worldly** - Geography education
6. **Learner** - Daily learning bites + mini-app

## Conditional Bot Loading

In development, run one bot at a time:

```bash
LOCAL_ACTIVE_BOT_ID=CHATBOT npm run dev
```

In production, all bots run:

```bash
IS_PROD=true npm start
```

Logic in `src/index.ts`. Each bot init is wrapped so one bot failing doesn't stop the rest:

```typescript
const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;
const initBot = async (config: { id: string }, init: () => Promise<void>): Promise<void> => {
  if (!shouldInitBot(config)) return;
  try {
    await init();
  } catch (err) {
    failedComponents.push(config.id);
    logger.error(`Failed to init bot '${config.id}': ${getErrorMessage(err)}`);
  }
};

await initBot(chatbotConfig, () => initChatbot(app));
```

The web features (`initStickers`, `initSavings`, `initMindloop`, `initZika`) boot regardless of `LOCAL_ACTIVE_BOT_ID`, each in its own try/catch.

## HTTP Surface

An Express server runs alongside the bots:

| Route | Owner |
| --- | --- |
| `GET /` | Health check (`{ success: true }`) |
| `/api-docs` | Swagger UI (`registerSwaggerRoutes`) |
| `/savings/*`, `/api/savings/*` | [Savings](/bots/savings) SPA and API |
| `/mindloop/*`, `/api/mindloop/*` | [Mindloop](/bots/mindloop) SPA and player API |
| `/earth/*` | [Earth](/bots/earth) SPA (no API), served by `initWorldly` |
| `/zika/*` | [Zika](/bots/zika) static showcase |
| `/learner/*`, `/api/learner/*` | Learner bot mini-app and progress API |
| `POST /portfolio/contact` | Portfolio site contact form (rate-limited) |
| `GET/POST /whatsapp-webhook` | [Stickers](/bots/stickers) WhatsApp webhook |

Bots may register their own routes too (mini-app data endpoints, webhooks). `initStickers(app)` must run **before** the global `express.json()` because the webhook needs the raw body for its HMAC signature check.

## Core Patterns

### 1. Manual Dependency Injection

Initialization functions set up services and controllers:

```typescript
// features/chatbot/chatbot.init.ts
export async function initChatbot(): Promise<void> {
  await Promise.all([
    createMongoConnection('Chatbot'),
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

- **Development**: `IS_PROD=false`, `LOCAL_ACTIVE_BOT_ID=CHATBOT`
- **Production**: `IS_PROD=true` (all bots run)
- **Google Sheets Logging**: Service account credentials for production logging

## Next Steps

- [Project Structure](/architecture/project-structure)
- [Code Style](/architecture/code-style)
- [Design Patterns](/architecture/patterns)
- [Database Patterns](/architecture/database)
