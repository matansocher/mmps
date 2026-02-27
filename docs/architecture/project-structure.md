# Project Structure

Detailed breakdown of the MMPS directory structure.

## Root Structure

```
mmps/
├── src/                    # Source code
├── docs/                   # VitePress documentation
├── dist/                   # Compiled JavaScript (generated)
├── coverage/               # Test coverage reports (generated)
├── .github/
│   └── workflows/          # GitHub Actions
├── .husky/                 # Git hooks
├── scripts/                # Utility scripts
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config
├── jest.config.js          # Test config
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
├── features/              # Bot implementations (6 bots)
│   ├── chatbot/           # AI-powered assistant bot
│   │   ├── agent/         # AI agent configuration
│   │   ├── chatbot.init.ts              # Initialization
│   │   ├── chatbot.controller.ts        # Telegram handlers
│   │   ├── chatbot.service.ts           # Business logic
│   │   ├── chatbot-scheduler.service.ts # Scheduled tasks
│   │   ├── chatbot.config.ts            # Bot config
│   │   ├── types.ts                     # Type definitions
│   │   └── index.ts                     # Exports
│   │
│   ├── coach/             # Sports bot
│   ├── langly/            # Language learning bot
│   ├── magister/          # Course management bot
│   ├── wolt/              # Restaurant bot
│   └── worldly/           # Geography bot
│
├── services/              # External service integrations (30+ services)
│   ├── telegram-grammy/   # Telegram bot framework
│   ├── openai/            # OpenAI integration
│   ├── anthropic/         # Anthropic integration
│   ├── mongodb/           # MongoDB setup
│   ├── google/            # Google services
│   ├── scores-365/        # Sports data API
│   ├── weather/           # Weather services
│   └── ...
│
├── shared/                # Shared utilities
│   ├── ai/                # AI tools (20+ tools)
│   │   └── tools/         # Individual tools
│   │       ├── weather/
│   │       ├── reminders/
│   │       └── ...
│   ├── sports/            # Sports utilities
│   ├── telegram/          # Telegram utilities
│   ├── utils/             # Utility functions
│   └── index.ts           # Exports
│
└── main.ts                # Application entry point
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
├── tools/                             # All AI tools
│   ├── weather/
│   │   └── weather.tool.ts
│   ├── reminders/
│   │   └── reminder.tool.ts
│   ├── calendar/
│   ├── github/
│   ├── google-sheets/
│   ├── twitter/
│   └── ... (20+ tools total)
│
└── services/                          # AI service utilities
    ├── ai.service.ts                  # Main AI service
    └── tool-callback-handler.ts       # Tool execution callbacks
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
- **jest.config.js** - Jest test configuration
- **coverage/** - Generated test coverage reports

### Git & CI/CD
- **.github/workflows/ci.yml** - GitHub Actions for testing and linting
- **.husky/** - Git hooks
- **commitlint.config.js** - Commit message validation

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
