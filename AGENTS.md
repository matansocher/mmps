# AGENTS.md

Single source of truth for AI agents (Claude Code, GitHub Copilot, Cursor, Codex, etc.) working in this repo. `CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md` are symlinks to this file — edit here.

This file holds **conventions and workflow only**. Feature behaviour (what each bot does, schedules, collections, env flags) lives in the VitePress docs under `docs/` — read the linked page when you work on that feature.

---

## TL;DR for a fresh agent

- **What this is:** Plain TypeScript (no framework) Node.js 24 app hosting **6 Telegram bots** + an Express HTTP server (Swagger, mini-app SPAs, webhooks). Built on grammY, LangGraph, MongoDB native driver.
- **Entry point:** `src/index.ts` (not `main.ts`). Bots boot when `IS_PROD=true` or `LOCAL_ACTIVE_BOT_ID` matches.
- **Local dev:** `LOCAL_ACTIVE_BOT_ID=<BOT_ID>` (UPPERCASE, e.g. `COACH`) in `.env`, then `npm run dev`.
- **Telegram:** always `@services/telegram`. `@services/telegram-grammy` does NOT exist.
- **AI:** LangGraph agents (`createAgent` from `langchain`), tools via `tool()` + Zod, registered through an `AgentDescriptor`.
- **DB:** MongoDB by name — `createMongoConnection('Chatbot')`, `getMongoCollection<T>(db, collection)`.
- **Apps:** `apps/*-web` are Vite mini-apps (npm workspaces).

---

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.

### 2. Simplicity First

- No features, abstractions or configurability beyond what was asked.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes

- Touch only what you must. Match existing style.
- Don't refactor or reformat adjacent code. Mention unrelated dead code — don't delete it.
- Remove imports/variables/functions that *your* change made unused.
- Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

- Define success criteria and loop until verified ("fix the bug" → write a failing test, make it pass).

### 5. Never Commit Unless Asked

- Do not `git commit`, `git push`, tag, amend or rewrite history unless the user explicitly asks.

### 6. Documentation Policy

Docs are **not** part of every change. Each fact has exactly one home:

| Kind of fact | Home |
|---|---|
| Conventions, code style, repo layout, agent workflow | `AGENTS.md` |
| Feature behaviour, schedules, collections, env flags, setup, architecture | `docs/` (VitePress) |
| Implementation details | the code itself |

- **Update `docs/`** only when user-visible behaviour, setup, env vars or architecture change.
- **Update `AGENTS.md`** only when conventions, structure or agent workflow change.
- **Never duplicate** feature facts between the two — link to the docs page instead.
- **No doc edits** for internal refactors, tests, or bug fixes that don't change documented behaviour.
- New env var → add it to `.env.example` (always).
- Larger drift is fixed by the periodic `/update-docs` sweep, not per change.

---

## Tech Stack

- **Plain TypeScript 5.9**, ES2022, **non-strict**; Node.js 24; Express 5; `node-cron`.
- **AI:** `langchain`, `@langchain/langgraph` (+ `@langchain/langgraph-checkpoint-mongodb`), `@langchain/openai`, `@langchain/anthropic`, `openai`, `@anthropic-ai/sdk`.
- **Data/bots:** `mongodb` (no ODM), `grammy` (+ `@grammyjs/hydrate`), `telegram` (MTProto client mode).
- **Utils:** `date-fns` / `date-fns-tz` (default tz `Asia/Jerusalem`), `zod`.
- **Quality:** Vitest 4, ESLint 9 (flat), Prettier 3 (200 cols, single quotes, trailing commas, **semicolons**).
- **Observability:** `@opentelemetry/*` → Grafana Cloud (preloaded via `node --import`, prod only).

### Path Aliases (`tsconfig.json`)

`@src/*` → `src/*` · `@core/*` → `src/core/*` · `@features/*` → `src/features/*` · `@services/*` → `src/services/*` · `@shared/*` → `src/shared/*` · `@decorators` → `src/decorators` · `@mocks` → `src/core/mocks` · `@config/*` → `src/config/*` · `@test/*` → `test/*`

---

## Project Structure

```
mmps/
├── src/
│   ├── core/           # Config, mongo, openapi/swagger, telemetry, utils
│   ├── features/       # Bots + bot-less web features
│   ├── services/       # External service integrations
│   ├── shared/         # Cross-bot business logic (AI tools live in shared/ai/tools)
│   └── index.ts        # Entry point — Express server + conditional bot init
├── apps/               # Vite mini-apps (npm workspaces)
├── docs/               # VitePress site (matansocher.github.io/mmps)
├── scripts/            # Standalone scripts
├── test/               # integration/ and e2e/ suites
├── .github/workflows/  # ci, ai (Codex), docs-deploy, heroku-deploy, pr-notify
└── .agents/skills/     # MMPS skills (.claude/skills is a symlink)
```

The full service catalog and shared-module list: [`docs/architecture/project-structure.md`](docs/architecture/project-structure.md).

### Feature Structure (per bot)

```
src/features/{name}/
├── {name}.init.ts                # initX(app?) — wires DI, registers routes/bot
├── {name}.controller.ts          # grammY handlers (ctx-driven)
├── {name}.service.ts             # Business logic
├── {name}-scheduler.service.ts   # Cron jobs (if needed)
├── {name}.config.ts              # BOT_CONFIG: { id, name, token, commands }
├── types.ts
├── index.ts                      # Barrel — exports BOT_CONFIG + init function
└── mongo/                        # Feature-specific repositories
```

### Service Structure

```
src/services/{name}/
├── api.ts or {name}.service.ts
├── types.ts
├── constants.ts                  # (if needed)
└── index.ts                      # Barrel
```

---

## Features

### Bots

| ID | Path | Docs |
|---|---|---|
| `CHATBOT` | `src/features/chatbot/` | [chatbot](docs/bots/chatbot.md), [deep dive](docs/bots/chatbot-deep-dive.md) |
| `CHILLI` | `src/features/chilli/` | [chilli](docs/bots/chilli.md) |
| `COACH` | `src/features/coach/` | [coach](docs/bots/coach.md) |
| `WOLT` | `src/features/wolt/` | [wolt](docs/bots/wolt.md) |
| `WORLDLY` | `src/features/worldly/` | [worldly](docs/bots/worldly.md); also serves the [Earth](docs/bots/earth.md) globe quiz mini app at `/earth/*` |
| `LEARNER` | `src/features/learner/` | [overview](docs/bots/overview.md) |

Token env var for each bot: `{ID}_TELEGRAM_BOT_TOKEN`.

### Web features (no bot, boot regardless of `LOCAL_ACTIVE_BOT_ID`)

| Feature | Served at | Docs |
|---|---|---|
| Savings | `/savings/*`, `/api/savings/*` | [savings](docs/bots/savings.md) |
| Mindloop | `/mindloop/*`, `/api/mindloop/*` | [mindloop](docs/bots/mindloop.md) |
| Zika | `/zika/*` | [zika](docs/bots/zika.md) |
| Stickers (WhatsApp) | `GET/POST /whatsapp-webhook` | [stickers](docs/bots/stickers.md) |
| Portfolio | `POST /portfolio/contact` | — |

`initStickers(app)` must run **before** the global `express.json()` — the webhook needs the raw body for HMAC verification.

### Boot logic (`src/index.ts`)

Each bot goes through `initBot(config, init)`: it skips unless `isProd || env.LOCAL_ACTIVE_BOT_ID === config.id`, and wraps `init()` in try/catch so one failing bot doesn't kill the rest. Web features have their own try/catch. Details: [`docs/architecture/overview.md`](docs/architecture/overview.md).

---

## Code Style

### Types — NEVER use `interface`

```typescript
// ✅
export type User = {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly username?: string;
};

// ❌
interface User { /* ... */ }
```

- Always `type`, properties `readonly`, prefer `Omit` / `Pick` / `Partial`.

### Functions vs Classes

- **Functions:** utilities, API calls, repository operations, stateless logic.
- **Classes:** stateful services, controllers, schedulers (`private readonly logger = new Logger(X.name)`).

### Documentation

**No JSDoc.** Inline `//` comments only for format specs (`// Format: "YYYY-MM-DD HH:MM"`), non-obvious logic, or important config notes.

### Naming

| Type | Convention | Example |
|---|---|---|
| Files | kebab-case + suffix | `chatbot-scheduler.service.ts` |
| Variables/Functions | camelCase | `getUserByUsername()` |
| Constants | SCREAMING_SNAKE | `DEFAULT_TIMEZONE` |
| Types / Classes | PascalCase (+ suffix for classes) | `CreateReminderData`, `ChatbotService` |

Suffixes: `.service.ts`, `.controller.ts`, `.init.ts`, `.config.ts`, `.spec.ts`.

---

## Imports & Exports

- Import order (Prettier-sorted): third-party → `@core` → `@decorators` → `@features` → `@mocks` → `@services` → `@shared` → `@test` → relative.
- Use path aliases for shared code, never long relative paths.
- **Named exports only — never default exports.** Every new file gets a barrel export in its `index.ts`.
- `import type` for type-only imports. `env` from `node:process`.

---

## Async & Error Handling

- **Always `async/await` — never `.then()` chains.** Parallelize with `Promise.all`.
- Validation: throw early (`if (!apiKey) throw new Error('API key not configured');`).
- Services: try/catch + `Logger`, return a safe fallback.
- Non-critical: inline `.catch()` (`await connectGithubMcp().catch((err) => logger.error(...))`).

```typescript
import { Logger } from '@core/utils';
const logger = new Logger('MyClass');
logger.log('info'); logger.warn('careful'); logger.error('boom'); logger.debug('trace');
```

---

## Architecture Patterns

### Manual DI via init functions

```typescript
export async function initChatbot(app: Express): Promise<void> {
  await createMongoConnection('Chatbot');
  const chatbotService = new ChatbotService();
  const chatbotController = new ChatbotController(chatbotService);
  const chatbotScheduler = new ChatbotSchedulerService(chatbotService);
  chatbotController.init();
  chatbotScheduler.init();
}
```

Init functions take `app` only if they register HTTP routes.

### Controller → Service → Repository

- **Controller:** grammY handlers. Use `ctx.*` (`ctx.reply`, `ctx.deleteMessage`) when `ctx` is available — not `this.bot.api.*`.
- **Service:** business logic; uses `bot.api.*` when there's no `ctx`.
- **Repository:** plain functions, never classes.

### Cron

```typescript
cron.schedule('00 23 * * *', () => this.handleDailySummary(), { timezone: DEFAULT_TIMEZONE });
```

### Telegram (`@services/telegram`)

Key exports: `provideTelegramBot(config)` (memoized per bot), `buildInlineKeyboard([{ text, data }])`, `getMessageData(ctx)`, `getCallbackQueryData(ctx)`, `MessageLoader`, `MessageStreamer`, `sendStyledMessage`, `sendShortenedMessage`, `downloadFile`, `removeItemFromInlineKeyboardMarkup`.

- Wrap file paths with `new InputFile(path)` from `grammy` for `sendVoice` / `sendPhoto` / `sendDocument`.
- Never import `node-telegram-bot-api` or `getInlineKeyboardMarkup` (legacy).

### GitHub automation

Labels trigger `.github/workflows/ai.yml` (OpenAI Codex): **`review`** on a PR → AI review comment; **`implement`** on an issue → implementation PR.

---

## AI Patterns

### Agent descriptor

```typescript
export type AgentDescriptor = {
  readonly name: string;
  readonly prompt: string;
  readonly description: string;
  readonly tools: StructuredTool[];
};
```

`createAgentService(descriptor, { model, checkpointer, middleware, toolCallbackOptions })` in `src/features/chatbot/agent/factory.ts` builds the agent. Canonical example: `src/features/chatbot/agent/`.

### Tool with Zod

```typescript
const schema = z.object({
  action: z.enum(['current', 'forecast']).describe('Action to perform'),
  location: z.string().describe('The city or location'),
});

async function runner({ action, location }: z.infer<typeof schema>) { /* ... */ }

export const weatherTool = tool(runner, { name: 'weather', description: 'Get weather information', schema });
```

### Adding a tool

1. Create `src/shared/ai/tools/{name}/{name}.tool.ts` (`.describe()` on every field).
2. Export it from `src/shared/ai/tools/index.ts`.
3. Register it in `src/features/chatbot/agent/agent.ts` (directories that aren't registered there are inactive).
4. List its read-only actions in `READ_ONLY_TOOL_ACTIONS` (`src/features/chatbot/agent/tool-retry.ts`) so they're retried on transient errors. Unlisted / side-effecting actions are never retried.
5. Put tool-specific rules (triggers, call order, confirmations, reply format) in the tool's `description`; `AGENT_PROMPT` holds only general behaviour.

### Chatbot internals

Memory (Mongo checkpointer + pruning), token-based summarization, structured output, tool retries, usage/cost metering, pricing drift check, weekly usage report, and the social-media collect → digest pipeline are documented in [`docs/bots/chatbot-deep-dive.md`](docs/bots/chatbot-deep-dive.md). Read it before touching `src/features/chatbot/agent/`, `src/shared/ai/usage/` or the chatbot schedulers.

---

## Database

- Connection string env var: **`MONGO_DB_URL`**.
- Each domain uses its own PascalCase DB (`Chatbot`, `Coach`, `Learner`, …) — see the feature's `mongo/constants.ts` or `constants.ts`.

```typescript
function getCollection(): Collection<Reminder> {
  return getMongoCollection<Reminder>('Reminders', 'reminders');
}

export async function createReminder(data: CreateReminderData): Promise<InsertOneResult<Reminder>> {
  return getCollection().insertOne({ ...data, status: 'pending', createdAt: new Date() } as Reminder);
}
```

---

## Environment Variables

The full list is in `.env.example` — every `env.X` the code reads must be there. Minimum for local dev: `MONGO_DB_URL`, `LOCAL_ACTIVE_BOT_ID`, `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY`, and the active bot's `*_TELEGRAM_BOT_TOKEN`. `IS_PROD=true` boots everything; `PORT` defaults to 3000. Timezone default: `Asia/Jerusalem` (`DEFAULT_TIMEZONE` in `@core/config`).

---

## Common Commands

```bash
npm run dev               # tsx watch src/index.ts
npm run build             # tsc + tsc-alias + mini-app builds
npm start                 # node dist/index.js
npm test                  # Vitest unit (src/**/*.spec.ts)
npm run test:integration  # test/integration
npm run test:e2e          # test/e2e (grammY mock harness)
npm run lint / lint:fix / format
npm run docs:dev / docs:build
npm run dev:<app>-web     # e.g. dev:savings-web, dev:earth-web
```

---

## Testing

`*.spec.ts` next to source, `describe()` for grouping, `test.each()` for tables, `.toEqual()` for assertions.

```typescript
describe('formatNumber()', () => {
  test.each([
    { num: 1000, expected: '1.0K' },
    { num: 1000000, expected: '1.0M' },
  ])('should return $expected when num is $num', ({ num, expected }) => {
    expect(formatNumber(num)).toEqual(expected);
  });
});
```

---

## Project-Local Skills

Skills live in `.agents/skills/{name}/SKILL.md` (Copilot CLI reads them natively; Claude Code via the `.claude/skills` symlink):

- `/review-style` — check changed files against these conventions.
- `/planner` — plan a feature with file table + reference patterns.
- `/update-docs` — **periodic** drift sweep of `docs/` against the code (not per change).
- `/scaffold-ai-tool`, `/scaffold-service` — scaffold a tool / service the MMPS way.
- `/integration-research` — feasibility + integration plan for an external API/site.
- `/playwright`, `/humanizer`, `/fact-checker`, `/prompt-master`, `/ui-ux-pro-max` — general purpose.

---

## Quick Reference

### DO
- `type` (never `interface`), `readonly` properties.
- `async/await`, named exports, path aliases, `import type`.
- Repository **functions**; `Logger` from `@core/utils`; `env` from `node:process`.
- Zod `.describe()` on every tool field.
- `ctx.*` in controllers; `buildInlineKeyboard`, `getMessageData`, `new InputFile(path)`.
- Barrel exports for new files; semicolons.

### DON'T
- `interface`, JSDoc, `.then()` chains, default exports, repository classes.
- `this.bot.api.*` in controllers when `ctx` exists.
- `node-telegram-bot-api`, `@services/telegram-grammy`, `getInlineKeyboardMarkup`.
- Duplicate feature details from `docs/` into this file.
- Commit or push unless asked.

---

## When in doubt

Read an analogous file in `features/` or `services/` and follow its shape.
