# AI Assistant Feature - Complete Implementation Guide

## Overview

The AI Assistant is a comprehensive Node.js/NestJS-based application that provides intelligent assistance through multiple channels (Slack, REST API) using LangChain and LangGraph for AI orchestration. It features a modular architecture with specialized agents, tools, and integrations for various enterprise systems.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Technologies](#core-technologies)
3. [Project Structure](#project-structure)
4. [Key Components](#key-components)
5. [Agent System](#agent-system)
6. [Tools Framework](#tools-framework)
7. [Features Implementation](#features-implementation)
8. [Shared Services](#shared-services)
9. [Configuration & Environment](#configuration--environment)
10. [Examples & Usage](#examples--usage)
11. [Implementation Guide](#implementation-guide)
12. [Best Practices](#best-practices)

## Architecture Overview

The AI Assistant follows a **multi-agent architecture** with the following key principles:

- **Modular Design**: Each feature is self-contained with its own module, controller, and services
- **Agent-Based**: Specialized AI agents handle different domains (Datadog, Confluence, etc.)
- **Tool Integration**: Extensible tool system for external API integrations
- **Multi-Channel**: Support for Slack, REST API, and other interfaces
- **Observability**: Built-in tracing, metrics, and logging
- **Scalability**: Redis-based caching and MongoDB checkpointing

### High-Level Flow

```
User Input → Controller → AI Service → LangGraph Agent → Tools → External APIs → Response
```

## Core Technologies

### Primary Stack
- **Node.js** with **TypeScript**
- **NestJS** - Enterprise-grade Node.js framework
- **LangChain** - AI/LLM orchestration framework
- **LangGraph** - State machine for complex AI workflows
- **Anthropic Claude** - Primary LLM provider

### Key Dependencies
```json
{
  "@langchain/anthropic": "^0.3.12",
  "@langchain/core": "^0.3.37",
  "@langchain/langgraph": "^0.2.46",
  "@langchain/mcp-adapters": "^0.4.5",
  "@nestjs/common": "^11.1.1",
  "@nestjs/core": "^11.1.1",
  "@slack/bolt": "^4.2.1",
  "mongodb": "^6.17.0",
  "ioredis": "^5.6.1",
  "dd-trace": "^5.48.1"
}
```

### Infrastructure
- **MongoDB** - Conversation checkpointing and persistence
- **Redis** - Caching and rate limiting
- **Datadog** - Observability and monitoring
- **Slack** - Primary user interface
- **Docker** - Containerization

## Project Structure

```
projects/ai-assistant/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app/
│   │   ├── app.module.ts       # Root module
│   │   └── types.ts
│   ├── features/               # Feature modules
│   │   ├── ask-me-anything/    # REST API feature
│   │   ├── slack-assistant/    # Slack integration
│   │   ├── pager-duty/         # PagerDuty integration
│   │   ├── figma-to-code/      # Figma to code conversion
│   │   └── health/             # Health checks
│   ├── agents/                 # AI agent definitions
│   │   ├── datadog.ts          # Datadog monitoring agent
│   │   ├── confluence.ts       # Documentation agent
│   │   ├── octokit.ts          # GitHub integration agent
│   │   └── ...
│   ├── tools/                  # External API tools
│   │   ├── datadog/            # Datadog API tools
│   │   ├── confluence/         # Confluence API tools
│   │   ├── backstage/          # Backstage API tools
│   │   └── ...
│   ├── shared/                 # Shared services
│   │   ├── agent/              # Core agent framework
│   │   ├── callbacks/          # LangChain callbacks
│   │   ├── metrics/            # Metrics collection
│   │   ├── redis/              # Redis client
│   │   └── slack/              # Slack utilities
│   └── tests/                  # Test files
├── examples/                   # Usage examples
├── Dockerfile                  # Container configuration
└── package.json               # Dependencies
```

## Key Components

### 1. Application Bootstrap (`main.ts`)

```typescript
import './shared/tracer';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SlackAssistant } from '@xpr/nestjs-slack-assistant';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  
  // Global configuration
  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ 
    transform: true, 
    whitelist: true, 
    forbidNonWhitelisted: true 
  }));
  
  // Slack microservice
  app.connectMicroservice({
    strategy: new SlackAssistant({
      slack: {
        token: conf.getOrThrow('SLACK_BOT_TOKEN'),
        appToken: conf.getOrThrow('SLACK_APP_LEVEL_TOKEN'),
        socketMode: true,
      },
    }),
  });

  await Promise.all([
    app.startAllMicroservices(), 
    openApi('api', app), 
    app.listen(8080)
  ]);
};
```

### 2. Root Module (`app.module.ts`)

```typescript
@Module({
  imports: [
    AlsModule,                    // Async Local Storage
    AsyncLoggerModule,            // Structured logging
    ConfigModule.forRoot(),       // Environment configuration
    
    // Feature modules
    HealthModule,
    PagerDutyModule,
    SlackAssistantModule,
    FigmaToCodeModule,
    BeckyModule,
    FrontendIngressModule,
    ConditionalModule.registerWhen(
      AskMeAnythingModule, 
      (env) => ['development', 'staging'].includes(env.NODE_ENV || '')
    ),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ContextLogMiddleware).forRoutes('/v:ver/*suf');
  }
}
```

## Agent System

### Core Agent Service (`shared/agent/service.ts`)

The `AiService` class wraps LangGraph agents with additional functionality:

```typescript
export class AiService {
  constructor(
    readonly agent: CompiledStateGraph<Any, Any>,
    options: AiServiceOptions,
  ) {
    this.name = options.name;
    this.recursionLimit = options.recursionLimit ?? 100;
  }

  invoke(message: string, opts: Partial<InvokeOptions> = {}) {
    return this.agent.invoke(createMessage(message, opts), this.createOptions(opts));
  }

  stream(message: string, opts: Partial<InvokeOptions> = {}) {
    return this.agent.stream(createMessage(message, opts), this.createOptions(opts));
  }

  getState(opts: Partial<InvokeOptions> = {}) {
    return this.agent.getState(this.createOptions(opts));
  }
}
```

### Agent Factory (`shared/agent/factory.ts`)

Creates agents with tools and orchestration capabilities:

```typescript
export function createAgent(descriptor: AgentDescriptor | OrchestratorDescriptor, opts: CreateAgentOptions) {
  const { name, prompt, tools = [] } = descriptor;
  const { llm, checkpointSaver = new MemorySaver(), responseFormat } = opts;

  // Handle multi-agent orchestration
  if ('agent' in descriptor && Array.isArray(descriptor.agents)) {
    for (const agent of descriptor.agents) {
      tools.push(asTool(createAgent(agent, { ...opts, checkpointSaver: new MemorySaver() })));
    }
  }

  return createReactAgent({ llm, checkpointSaver, tools, prompt, name, responseFormat });
}
```

### Agent Types

#### 1. Simple Agent
```typescript
export type AgentDescriptor = {
  name: string;
  description?: string;
  prompt: string;
  tools: (DynamicTool | DynamicStructuredTool<Any>)[];
};
```

#### 2. Orchestrator Agent
```typescript
export type OrchestratorDescriptor = Omit<AgentDescriptor, 'description' | 'tools'> & {
  agents: AgentDescriptor[];
  tools?: AgentDescriptor['tools'];
};
```

### Example Agent Implementation (`agents/datadog.ts`)

```typescript
const name = 'DATADOG';
const prompt = `
You are a Datadog Observability Expert with access to Datadog's monitoring platform.
Your role is to help users retrieve, analyze, and interpret observability data.

You have access to the following Datadog tools:
1. health_check: Verify API credentials
2. get_monitors: Retrieve monitor configurations
3. get_metrics: Fetch time-series data
4. search_logs: Query log data
5. get_incidents: Access incident data

**Working with multiple Datadog accounts**
- Specify account with \`account\` parameter
- Supported accounts: "RingLead", "EverString", "NeverBounce", "Tellwise", "ZoomInformation"
`;

export async function datadogAgent() {
  const tools = await loadDatadogMcpTools();
  
  return {
    name,
    prompt,
    description: 'Calls the Datadog agent to interact with Datadog monitoring platform',
    tools,
  };
}
```

## Tools Framework

### Tool Structure

Tools are LangChain-compatible functions that integrate with external APIs:

```typescript
export const datadogLogsTool = tool(runner, {
  name: 'datadog_logs_search',
  description: `Searches DataDog logs based on query string.
                Filter using tags: status, kube_namespace, cloud_provider, etc.
                Specify time range and limit results.`,
  schema: z.object({
    query: z.string().describe('Query string with available tags'),
    startTime: z.string().describe('Start time in ISO format'),
    endTime: z.string().describe('End time in ISO format'),
    limit: z.number().default(20).describe('Number of logs to return'),
  }),
});
```

### Tool Implementation Pattern

```typescript
async function runner(params: ToolParams) {
  const { query, limit = 10, startTime, endTime } = params;
  
  // Prepare API request
  const headers = {
    'Content-Type': 'application/json',
    'DD-API-KEY': DATADOG_API_KEY,
    'DD-APPLICATION-KEY': DATADOG_APP_KEY,
  };
  
  const queryParams = new URLSearchParams({
    'filter[query]': query,
    'filter[from]': startTime,
    'filter[to]': endTime,
    'page[limit]': limit.toString(),
  });
  
  // Make API call
  const res = await fetch(`https://api.datadoghq.com/api/v2/logs/events?${queryParams}`, { headers });
  
  if (!res.ok) {
    const errorBody = await res.json();
    logger.error(`API call failed: ${res.status} - ${errorBody}`);
    return `API call failed: ${errorBody}`;
  }
  
  // Process and return results
  const data = await res.json();
  return data.length > 0 ? { data } : 'No results found.';
}
```

### MCP (Model Context Protocol) Integration

For external tool servers:

```typescript
async function loadDatadogMcpTools() {
  const client = new MultiServerMCPClient({
    mcpServers: {
      'datadog-mcp': {
        url: env('DATADOG_MCP_SERVER_URL'),
        transport: 'http',
      },
    },
  });
  
  const tools = await client.getTools('datadog-mcp');
  
  // Convert JSON Schema to Zod
  tools.forEach((tool) => {
    tool.schema = jsonSchemaToZod(tool.schema as JsonSchema);
  });
  
  return tools;
}
```

## Features Implementation

### 1. Ask Me Anything Feature

**Controller** (`features/ask-me-anything/ask-me-anything.controller.ts`):
```typescript
@ApiTags('ask-me-anything')
@Controller({ path: 'ask-me-anything', version: '1' })
export class AskMeAnythingController {
  constructor(private readonly service: AiService) {}

  @ApiBody({ type: QuestionDTO })
  @Post()
  protected async askMeAnything(@Body() { question }: QuestionDTO): Promise<unknown> {
    const answer = await this.service.invoke(question);
    const msg = answer.messages.at(-1) as BaseMessage;
    return { answer: msg.content };
  }
}
```

**DTO** (`features/ask-me-anything/types.ts`):
```typescript
export class QuestionDTO {
  @ApiProperty({ description: 'Ask me anything!', default: env.SWAGGER_DEFAULT_QUESTION })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  readonly question!: string;
}
```

### 2. Slack Assistant Feature

**Controller** (`features/slack-assistant/slack-assistant.controller.ts`):
```typescript
@SlackController()
export class SlackAssistantController {
  constructor(
    private readonly agent: AiService,
    @Inject(SUMMARIZATION_MODEL) private readonly summaryModel: ChatAnthropic,
  ) {}

  @ThreadStarted()
  async startConversation({ say }: ThreadStartedArgs) {
    await say("Hi! :wave:\nI'm here to assist with questions about ZoomInfo's systems.");
  }

  @UserMessage()
  async onMessage(event: UserMessageArgsExtended): Promise<void> {
    const { message, context, client } = event;
    const { channel, thread_ts, ts, text } = message;
    
    const system = `User message from Slack channel '${channel}'.
                   Bot user ID: '${context.botUserId}'.
                   Current time: ${new Date().toISOString()}.`;
    
    const threadId = `${channel}-${(thread_ts || ts).replace(/\./g, '-')}`;
    
    // Set typing indicator
    await client.assistant.threads.setStatus({ 
      channel_id: channel, 
      thread_ts: thread_ts as string, 
      status: 'is preparing a reply...' 
    });
    
    // Get AI response
    const answer = await this.agent.invoke(text, { 
      threadId, 
      system, 
      callbacks: [createTracerCallback(threadId)] 
    });
    
    // Send response with feedback buttons
    await sendWithFeedbackActions(client, {
      channel,
      thread_ts,
      mainMessageText: answer.messages.at(-1).content,
      context: { feature: 'slack.assistant.message', 'user.input': text },
    });
  }

  @SlackEvent('app_mention')
  async onMention({ event, client }: EndpointArgs<SlackEventMiddlewareArgs<'app_mention'>>) {
    // Handle @mentions in channels
    const { channel, thread_ts, ts, text } = event;
    
    const system = `User mentioned you in Slack channel '${channel}'.
                   If you need context, fetch thread replies or channel history.`;
    
    const threadId = `${channel}-${(thread_ts || ts).replace(/\./g, '-')}`;
    
    // Add reaction to show processing
    await client.reactions.add({ channel, name: 'eyes', timestamp: ts });
    
    const answer = await this.agent.invoke(text, { threadId, system });
    
    await sendWithFeedbackActions(client, {
      channel,
      thread_ts,
      mainMessageText: answer.messages.at(-1).content,
    });
  }
}
```

## Shared Services

### 1. Metrics Collection (`shared/metrics/submit-metrics.ts`)

```typescript
export type MetricTags = Record<string, string | number>;

export type Metric = {
  metric: string;
  type: 1 | 2 | 3; // count | gauge | histogram
  value: number;
  tags: MetricTags;
};

export async function submitMetrics(metrics: Metric[]): Promise<void> {
  // Submit to Datadog or other metrics backend
  for (const metric of metrics) {
    // Implementation depends on metrics backend
  }
}
```

### 2. Redis Caching (`shared/redis/simple-cache.service.ts`)

```typescript
@Injectable()
export class SimpleCacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.setex(key, ttlSeconds, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }
}
```

### 3. Slack Utilities (`shared/slack/post-message-with-feedback.ts`)

```typescript
export async function sendWithFeedbackActions(
  client: WebClient,
  options: {
    channel: string;
    thread_ts?: string;
    mainMessageText: string;
    context?: Record<string, unknown>;
  }
): Promise<void> {
  const { channel, thread_ts, mainMessageText, context } = options;
  
  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: mainMessageText },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '👍 Good' },
          action_id: 'good_feedback_action',
          value: JSON.stringify(context),
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '👎 Bad' },
          action_id: 'bad_feedback_action',
          value: JSON.stringify(context),
        },
      ],
    },
  ];
  
  await client.chat.postMessage({ channel, thread_ts, blocks });
}
```

### 4. Tracing Callbacks (`shared/callbacks/`)

```typescript
export function createTracerCallback(threadId: string): BaseCallbackHandler {
  return new CallbackHandler({
    handleLLMStart: (llm, prompts) => {
      // Log LLM invocation start
    },
    handleLLMEnd: (output) => {
      // Log LLM completion
    },
    handleToolStart: (tool, input) => {
      // Log tool execution start
    },
    handleToolEnd: (output) => {
      // Log tool completion
    },
  });
}
```

## Configuration & Environment

### Environment Variables

```bash
# Core Configuration
NODE_ENV=development
PORT=8080
SKIP_SLACK_APP=false

# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_LEVEL_TOKEN=xapp-your-app-token
SLACK_SUMMARIZE_SHORTCUT_NAME=dev-summarize

# AI/LLM Configuration
ANTHROPIC_API_KEY=your-anthropic-key
SWAGGER_DEFAULT_QUESTION="What is ZoomInfo?"

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/ai-assistant
REDIS_URL=redis://localhost:6379

# External APIs
DATADOG_API_KEY=your-datadog-api-key
DATADOG_APP_KEY=your-datadog-app-key
DATADOG_MCP_SERVER_URL=http://localhost:3001

# Observability
DD_TRACE_ENABLED=true
DD_SERVICE=ai-assistant
DD_ENV=development
```

### Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Start application
CMD ["node", "dist/main.js"]
```

## Examples & Usage

### 1. Basic Agent Example (`examples/ask-me-anything-agent.ts`)

```typescript
import { confluenceAgent } from '../src/agent/confluence';
import { datadogAgent } from '../src/agent/datadog';

const name = 'Ask Me Anything';
const prompt = `
You are the ZoomInfo Productivity chatbot.
Your role is to answer anything related to ZoomInfo systems.

Guidelines:
- Be concise in responses
- Only respond to user requests, don't provide unrequested information
- Include links for reference
- Use agents for specific domain queries
`;

const agents = [datadogAgent, confluenceAgent];

export default { name, prompt, agents, tools: [] };
```

### 2. REST API Usage

```bash
# Ask a question via REST API
curl -X POST http://localhost:8080/api/v1/ask-me-anything \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the current error rates in production?"}'
```

### 3. Slack Usage

```
# Direct message to bot
@ai-assistant What services are currently experiencing issues?

# In channel mention
@ai-assistant Can you summarize the recent deployment issues?

# Use shortcut for conversation summary
/dev-summarize (on any message with replies)
```

## Implementation Guide

### Step 1: Project Setup

1. **Initialize NestJS Project**
```bash
npm i -g @nestjs/cli
nest new ai-assistant
cd ai-assistant
```

2. **Install Dependencies**
```bash
npm install @langchain/anthropic @langchain/core @langchain/langgraph
npm install @nestjs/common @nestjs/core @nestjs/config
npm install @slack/bolt @slack/web-api
npm install mongodb ioredis dd-trace
npm install class-validator zod uuid
```

3. **Setup Project Structure**
```bash
mkdir -p src/{features,agent,tools,shared}
mkdir -p src/shared/{agent,callbacks,metrics,redis,slack}
```

### Step 2: Core Agent Framework

1. **Create Agent Service** (`src/shared/agent/service.ts`)
2. **Create Agent Factory** (`src/shared/agent/factory.ts`)
3. **Setup Base Module** (`src/shared/agent/types.ts`)

### Step 3: Implement Features

1. **Create Feature Module**
```typescript
@Module({
  imports: [AgentModule],
  controllers: [FeatureController],
  providers: [FeatureService],
})
export class FeatureModule {}
```

2. **Create Controller**
```typescript
@Controller({ path: 'feature', version: '1' })
export class FeatureController {
  constructor(private readonly agent: AiService) {}
  
  @Post()
  async handleRequest(@Body() dto: RequestDTO) {
    return this.agent.invoke(dto.message);
  }
}
```

### Step 4: Add Tools

1. **Create Tool Function**
```typescript
export const myTool = tool(async (params) => {
  // Tool implementation
  return result;
}, {
  name: 'my_tool',
  description: 'Tool description',
  schema: z.object({
    param: z.string().describe('Parameter description'),
  }),
});
```

2. **Register Tool with Agent**
```typescript
export function myAgent() {
  return {
    name: 'MY_AGENT',
    prompt: 'Agent prompt...',
    tools: [myTool],
  };
}
```

### Step 5: Setup Slack Integration

1. **Configure Slack App**
    - Create Slack app at api.slack.com
    - Enable Socket Mode
    - Add bot scopes: `chat:write`, `app_mentions:read`, `channels:read`
    - Install to workspace

2. **Implement Slack Controller**
```typescript
@SlackController()
export class SlackController {
  @UserMessage()
  async onMessage(event: UserMessageArgs) {
    // Handle user messages
  }
  
  @SlackEvent('app_mention')
  async onMention(event: MentionEvent) {
    // Handle @mentions
  }
}
```

### Step 6: Add Observability

1. **Setup Tracing**
```typescript
import './shared/tracer'; // Import at top of main.ts
```

2. **Add Metrics**
```typescript
await submitMetrics([
  { metric: 'request.count', type: 1, value: 1, tags: { feature: 'chat' } }
]);
```

3. **Setup Logging**
```typescript
const logger = new Logger('FeatureName');
logger.info('Processing request', { context });
```

## Best Practices

### 1. Agent Design

- **Single Responsibility**: Each agent should handle one domain
- **Clear Prompts**: Write detailed, specific prompts with examples
- **Tool Selection**: Only include relevant tools for the agent's domain
- **Error Handling**: Gracefully handle tool failures and API errors

### 2. Tool Implementation

- **Validation**: Use Zod schemas for input validation
- **Error Messages**: Return user-friendly error messages
- **Rate Limiting**: Implement rate limiting for external APIs
- **Caching**: Cache expensive API calls when appropriate

### 3. Performance

- **Async Operations**: Use async/await for all I/O operations
- **Connection Pooling**: Use connection pools for databases
- **Memory Management**: Avoid memory leaks in long-running processes
- **Monitoring**: Monitor response times and error rates

### 4. Security

- **Input Validation**: Validate all user inputs
- **API Keys**: Store sensitive data in environment variables
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **Logging**: Don't log sensitive information

### 5. Testing

- **Unit Tests**: Test individual components
- **Integration Tests**: Test feature workflows
- **Mocking**: Mock external APIs in tests
- **Error Scenarios**: Test error handling paths

### 6. Deployment

- **Health Checks**: Implement health check endpoints
- **Graceful Shutdown**: Handle shutdown signals properly
- **Environment Configs**: Use different configs per environment
- **Monitoring**: Set up alerts for critical metrics

### 7. Maintenance

- **Documentation**: Keep documentation up to date
- **Versioning**: Version your APIs properly
- **Backwards Compatibility**: Maintain backwards compatibility
- **Regular Updates**: Keep dependencies updated

## Conclusion

This AI Assistant implementation provides a robust, scalable foundation for building enterprise AI applications. The modular architecture allows for easy extension with new agents, tools, and features while maintaining clean separation of concerns.

Key strengths:
- **Modular Architecture**: Easy to extend and maintain
- **Multi-Channel Support**: Slack, REST API, and more
- **Enterprise Ready**: Built-in observability, caching, and error handling
- **AI-First Design**: Leverages modern AI orchestration frameworks
- **Production Tested**: Includes real-world patterns and practices

Use this documentation as a blueprint for implementing similar AI assistant features in your own applications.
