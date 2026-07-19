# Project Structure

Detailed breakdown of the MMPS directory structure.

## Root Structure

```
mmps/
├── src/                    # Source code
├── apps/                   # npm workspaces — Vite mini-apps (chatbot-web, clutch-web, coach-web, expenses-web, learner-web, savings-web)
├── docs/                   # VitePress documentation
├── dist/                   # Compiled JavaScript (generated)
├── coverage/               # Test coverage reports (generated)
├── .github/
│   └── workflows/          # GitHub Actions
├── .agents/
│   └── skills/             # Project-local agent skills (SKILL.md format)
├── .husky/                 # Git hooks
├── scripts/                # Utility scripts
├── AGENTS.md               # Canonical agent instructions (CLAUDE.md, GEMINI.md, .github/copilot-instructions.md are symlinks)
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config
├── vitest.config.ts        # Test config (unit)
├── vitest.integration.config.ts # Test config (integration)
├── vitest.e2e.config.ts    # Test config (bot E2E)
├── eslint.config.mjs       # Linting rules
└── .prettierrc.json        # Code formatting
```

## Source Structure

```
src/
├── core/                   # Core utilities and config
│   ├── config/            # Configuration
│   │   └── main.config.ts # Main configuration (timezone, env)
│   ├── utils/             # Utility functions
│   │   ├── logger.ts      # Logger class
│   │   ├── mongo.ts       # MongoDB connection helpers
│   │   └── ...
│   └── index.ts           # Barrel export
│
├── features/              # Bot implementations (8 bots + clutch and savings web apps)
│   ├── chatbot/           # AI-powered assistant bot
│   │   ├── agent/         # AI agent configuration
│   │   ├── schedulers/    # Scheduler implementations
│   │   ├── chatbot.init.ts              # Initialization
│   │   ├── chatbot.controller.ts        # Telegram handlers
│   │   ├── chatbot.service.ts           # Business logic
│   │   ├── chatbot-scheduler.service.ts # Scheduled tasks
│   │   ├── chatbot.config.ts            # Bot config
│   │   ├── types.ts                     # Type definitions
│   │   └── index.ts                     # Exports
│   │
│   ├── chilli/            # Cat persona bot (Hebrew)
│   ├── clutch/            # Static SPA (no bot)
│   ├── coach/             # Sports bot
│   ├── expenses/          # Expense tracker mini-app bot
│   ├── learner/           # Courses mini-app bot
│   ├── savings/           # Shared MongoDB-backed portfolio SPA
│   ├── secretary/         # Personal secretary (business connection)
│   ├── wolt/              # Restaurant bot
│   └── worldly/           # Geography bot
│
├── services/              # External service integrations (30+ services)
│   ├── telegram/          # grammY bot utilities (THE telegram service)
│   ├── telegram-client/   # MTProto user-mode client
│   ├── openai/            # OpenAI integration
│   ├── anthropic/         # Anthropic integration
│   ├── scores-365/        # Sports data API
│   ├── weather/           # Weather services
│   └── ...
│
├── shared/                # Cross-bot business logic
│   ├── ai/                # Agents, tools, usage tracking, utils
│   │   └── tools/         # Individual tools
│   │       ├── weather/
│   │       ├── reminders/
│   │       └── ...
│   ├── sports/            # Sports utilities
│   └── ...                # reminders, friends, expenses, etc.
│
└── index.ts               # Application entry point
```

## Feature Directory Pattern

Each bot follows this structure:

```
features/{bot}/
├── {bot}.init.ts                      # Initialization (DI setup)
├── {bot}.controller.ts                # Telegram handlers (grammY)
├── {bot}.service.ts                   # Business logic
├── {bot}-scheduler.service.ts         # Scheduled tasks (optional)
├── {bot}.config.ts                    # Bot configuration
├── types.ts                           # Type definitions
├── index.ts                           # Barrel exports
├── utils.ts                           # Bot-specific utilities
├── mongo/                             # Data access layer
│   └── {bot}.repository.ts            # Repository functions
├── agent/ (chatbot only)              # AI agent setup
└── schedulers/ (chatbot only)         # Multiple schedulers
```

## Service Directory Pattern

```
services/{name}/
├── constants.ts                       # Constants and configuration
├── types.ts                           # Type definitions
├── index.ts                           # Barrel exports
└── utils/                             # Utility functions (optional)
    ├── function-1.ts                  # Individual functions
    ├── function-2.ts
    ├── helpers.ts                     # Helper functions (e.g., mappers, validators)
    └── index.ts                       # Barrel exports
```

### Example: GitHub Service

```
services/github/
├── constants.ts                       # Repo owner/name, default labels
├── types.ts                           # Issue, PullRequest, IssueComment types
├── index.ts                           # Re-exports from utils
└── utils/
    ├── octokit.ts                     # Octokit client initialization
    ├── mappers.ts                     # Data transformation helpers
    ├── create-issue.ts                # createIssue() function
    ├── get-issue.ts                   # getIssue() function
    ├── update-issue.ts                # updateIssue() function
    ├── create-issue-comment.ts        # createIssueComment() function
    ├── create-pull-request-comment.ts # createPullRequestComment() function
    ├── list-issues.ts                 # listIssues() function
    ├── list-pull-requests.ts          # listPullRequests() function
    └── index.ts                       # Barrel exports
```

**Benefits of utils breakdown**:
- Single responsibility per file
- Easy to test individual functions
- Clear separation of concerns
- Scalable for adding more operations
- Each function handles its own error logging

## AI Tools Structure

```
shared/ai/
├── tools/                             # All AI tools (27+ tool directories)
│   ├── weather/
│   │   └── weather.tool.ts
│   ├── reminders/
│   │   └── reminder.tool.ts
│   ├── calendar/
│   ├── github/
│   ├── twitter/
│   └── ...
│
├── usage/                             # Token/cost usage tracking (repository + record helpers)
└── utils/                             # AI utilities
    ├── tool-callback-handler.ts       # Tool execution callbacks
    ├── usage-callback-handler.ts      # Token usage metering
    └── model-pricing.ts               # USD-per-token pricing table
```

## Configuration Files

### TypeScript
- **tsconfig.json** - Main TypeScript config
- **tsconfig.build.json** - Build-specific config
- **Path aliases**: `@src/*`, `@core/*`, `@features/*`, `@services/*`, `@shared/*`, `@config/*`

### Code Quality
- **eslint.config.mjs** - ESLint rules (flat config)
- **.prettierrc.json** - Prettier formatting (200 char width, single quotes, semicolons)
- **.prettierignore** - Files to skip formatting

### Testing
- **vitest.config.ts** - Vitest unit-test configuration (`src/**/*.spec.ts`)
- **vitest.integration.config.ts** - Vitest integration suite (`test/integration/**/*.spec.ts`)
- **vitest.e2e.config.ts** - Vitest bot E2E suite (`test/e2e/**/*.spec.ts`)
- **test/e2e/harness/** - grammY mock harness for network-free bot tests
- **coverage/** - Generated test coverage reports

### Git & CI/CD
- **.github/workflows/ci.yml** - GitHub Actions for testing and linting
- **.husky/** - Git hooks
- **commitlint.config.cjs** - Commit message validation

## Import Paths

Use path aliases in imports:

```typescript
import { Logger } from '@core/utils';           // core utilities
import { initChatbot } from '@features/chatbot'; // features
import { openaiAPI } from '@services/openai';    // services
import { weatherTool } from '@shared/ai/tools';  // shared utilities
```

## Module Exports

Use barrel exports (`index.ts`) for clean imports:

```typescript
// ✅ CORRECT
import { ChatbotService } from '@features/chatbot';

// ❌ AVOID
import { ChatbotService } from '@features/chatbot/chatbot.service';
```

Each feature and service should export from `index.ts`:

```typescript
// features/chatbot/index.ts
export { BOT_CONFIG } from './chatbot.config';
export { initChatbot } from './chatbot.init';
export { ChatbotService } from './chatbot.service';
export * from './types';
```

## Next Steps

- [Code Style Guide](/architecture/code-style)
- [Naming Conventions](/architecture/naming-conventions)
- [Architecture Patterns](/architecture/patterns)
- [Database Patterns](/architecture/database)
