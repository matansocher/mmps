# Architecture Patterns

Core patterns and best practices used throughout MMPS.

## Manual Dependency Injection

Each bot uses initialization functions to set up its services, controllers, and schedulers.

### Pattern Example

```typescript
// features/chatbot/chatbot.init.ts
export async function initChatbot(): Promise<void> {
  // 1. Create connections
  await Promise.all([
    createMongoConnection('chatbot-db'),
    connectGithubMcp().catch((err) => console.error(err)),
  ]);

  // 2. Create services (business logic)
  const chatbotService = new ChatbotService();

  // 3. Create controllers (request handlers)
  const chatbotController = new ChatbotController(chatbotService);

  // 4. Create schedulers (background tasks)
  const chatbotScheduler = new ChatbotSchedulerService(chatbotService);

  // 5. Initialize (register handlers, start crons)
  chatbotController.init();
  chatbotScheduler.init();
}
```

### Main Entry Point

Conditionally load bots in `main.ts`:

```typescript
const shouldInitBot = (config: { id: string }) => isProd || env.LOCAL_ACTIVE_BOT_ID === config.id;

if (shouldInitBot(chatbotBotConfig)) await initChatbot();
if (shouldInitBot(coachBotConfig)) await initCoach();
// ... other bots
```

**Benefits**:
- No IoC container overhead
- Simple and explicit
- Easy to debug
- Full TypeScript support

## Service Layer Architecture

MMPS uses a three-layer pattern: Controller → Service → Repository.

### Controllers (Telegram Handlers)

```typescript
export class ChatbotController {
  private readonly bot = provideTelegramBot(BOT_CONFIG);
  
  constructor(private readonly chatbotService: ChatbotService) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
    this.bot.on('message', (ctx) => this.messageHandler(ctx));
    this.bot.on('callback_query', (ctx) => this.callbackHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await ctx.reply('Welcome to Chatbot!');
  }

  private async messageHandler(ctx: Context): Promise<void> {
    const { text, chatId } = getMessageData(ctx);
    const response = await this.chatbotService.processMessage(text, chatId);
    await ctx.reply(response);
  }
}
```

**Key Points**:
- Register grammY handlers in `init()`
- Use `ctx` methods when context is available
- Delegate business logic to service

### Services (Business Logic)

```typescript
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly aiService: AiService;

  constructor() {
    this.aiService = createAgentService(agent(), { model: new ChatOpenAI() });
  }

  async processMessage(message: string, chatId: number): Promise<string> {
    try {
      const response = await this.aiService.invoke(message);
      await saveConversation(chatId, message, response);
      return response;
    } catch (err) {
      this.logger.error(`Processing failed: ${err}`);
      return 'An error occurred';
    }
  }
}
```

**Key Points**:
- Contains all business logic
- Uses Logger for errors/info
- Calls repositories for data access
- Handles errors gracefully

### Repositories (Data Access)

```typescript
// functions, not classes
function getCollection(): Collection<Conversation> {
  return getMongoCollection<Conversation>('chatbot-db', 'conversations');
}

export async function createConversation(data: CreateConversationData): Promise<void> {
  return getCollection().insertOne({
    ...data,
    createdAt: new Date(),
    status: 'active',
  });
}

export async function getConversationHistory(userId: number, limit: number = 10): Promise<Conversation[]> {
  return getCollection()
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function updateConversation(id: ObjectId, updates: Partial<Conversation>): Promise<void> {
  await getCollection().updateOne({ _id: id }, { $set: updates });
}
```

**Key Points**:
- Use functions, not classes
- One collection per repository file
- Clear function names (create, get, update, delete)
- Type-safe with generics

## Scheduled Tasks (Cron)

Use `node-cron` for background jobs:

```typescript
import cron from 'node-cron';
import { DEFAULT_TIMEZONE } from '@core/config';

export class ChatbotSchedulerService {
  constructor(private readonly chatbotService: ChatbotService) {}

  init(): void {
    // Run at 23:00 every day
    cron.schedule(`0 23 * * *`, () => this.sendDailySummary(), { 
      timezone: DEFAULT_TIMEZONE 
    });

    // Run at 12:59 and 23:59 every day
    cron.schedule(`59 12,23 * * *`, () => this.updateFootballData(), {
      timezone: DEFAULT_TIMEZONE
    });

    // Run every 5 minutes
    cron.schedule(`*/5 * * * *`, () => this.processPendingReminders());
  }

  private async sendDailySummary(): Promise<void> {
    try {
      const summary = await this.chatbotService.generateDailySummary();
      // Send to users
    } catch (err) {
      console.error('Daily summary failed:', err);
    }
  }

  private async updateFootballData(): Promise<void> {
    // Update logic
  }

  private async processPendingReminders(): Promise<void> {
    // Process logic
  }
}
```

**Key Points**:
- Schedule in `init()` method
- Always use try-catch
- Log errors to console
- Use `DEFAULT_TIMEZONE` for consistency

## Configuration Pattern

Each bot has a dedicated config file:

```typescript
// features/chatbot/chatbot.config.ts
export const BOT_CONFIG: TelegramBotConfig = {
  id: 'CHATBOT',
  name: 'Chatbot',
  token: 'CHATBOT_TELEGRAM_BOT_TOKEN',
  description: 'AI-powered chatbot assistant',
  commands: {
    START: { 
      command: '/start', 
      description: 'Start using the chatbot', 
      hide: true 
    },
    HELP: { 
      command: '/help', 
      description: 'Get help' 
    },
    STATUS: { 
      command: '/status', 
      description: 'Check bot status' 
    },
  },
};
```

**Used for**:
- Conditional bot loading
- Command registration
- Environment variable mapping
- Bot metadata

## AI Tools with Zod Validation

All AI tools use Zod for schema validation:

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const weatherSchema = z.object({
  action: z.enum(['current', 'forecast']).describe('Weather action'),
  location: z.string().describe('City or location name'),
  date: z.string().optional().describe('Date in YYYY-MM-DD format'),
});

async function weatherRunner(input: z.infer<typeof weatherSchema>) {
  switch (input.action) {
    case 'current':
      return await getCurrentWeather(input.location);
    case 'forecast':
      return await getForecastWeather(input.location, input.date!);
  }
}

export const weatherTool = tool(weatherRunner, {
  name: 'weather',
  description: 'Get weather information for a location',
  schema: weatherSchema,
});
```

**Key Points**:
- Use `.describe()` on Zod fields
- Return clear, formatted strings
- Handle errors gracefully
- No side effects (read-only)

## LangGraph Agent Pattern (Chatbot)

The Chatbot uses LangGraph for orchestrating AI agents:

```typescript
// features/chatbot/agent/index.ts
export function createChatbotAgent() {
  const tools = [
    weatherTool,
    reminderTool,
    calendarTool,
    weatherTool,
    // ... more tools
  ];

  const model = new ChatOpenAI({ model: 'gpt-4-mini' }).bindTools(tools);

  const agent = createReactAgent({
    llmWithTools: model,
    tools,
    systemPrompt: `You are a helpful AI assistant...`,
    checkpointSaver: new MemorySaver(),
  });

  return agent;
}
```

**Benefits**:
- Memory persistence with MemorySaver
- Automatic tool execution
- Clear state management
- Easy to test

## Error Handling Strategy

### Validation Errors (Fail Fast)

```typescript
if (!apiKey) throw new Error('API key not configured');
if (date > today) throw new Error('Cannot set reminder in the future');
```

### Service Errors (Log & Recover)

```typescript
async processMessage(message: string): Promise<Response> {
  try {
    return await this.aiService.invoke(message);
  } catch (err) {
    this.logger.error(`Service error: ${err}`);
    return { message: 'An error occurred', toolResults: [] };
  }
}
```

### Non-Critical Errors (Silent Fail)

```typescript
await connectGithubMcp().catch((err) => {
  console.error('GitHub MCP connection failed:', err);
  // Continue without GitHub features
});
```

## Type Safety with Readonly

```typescript
// Function parameter
export async function sendMessage(
  chatId: number,
  message: Readonly<MessageData>
): Promise<void> {
  // Cannot modify message
}

// Immutable object
const config: Readonly<BotConfig> = {
  id: 'CHATBOT',
  name: 'Chatbot',
};
```

## Next Steps

- [Database Patterns](/architecture/database)
- [Code Style](/architecture/code-style)
- [Testing Guide](/development/testing)
