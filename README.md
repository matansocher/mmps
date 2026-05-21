# MMPS — Multi-Purpose Telegram Bots

A TypeScript Node.js 24 app hosting **5 AI-powered Telegram bots** plus an Express HTTP server (Swagger, auth for the companion browser extension, mini-app endpoints). No framework — plain TS with manual DI.

**📚 [Full Documentation](https://matansocher.github.io/mmps/)** &nbsp;·&nbsp; **🤖 [AGENTS.md](./AGENTS.md)** (canonical onboarding for AI agents and humans) &nbsp;·&nbsp; **⚡ [Quick Start](#quick-start)**

## Quick Start

```bash
git clone https://github.com/matansocher/mmps
cd mmps
npm install

# Configure environment
cp .env.example .env          # then fill in values you need
# At minimum: MONGO_DB_URL, LOCAL_ACTIVE_BOT_ID, the bot's *_TELEGRAM_BOT_TOKEN,
# and one of OPENAI_API_KEY / ANTHROPIC_API_KEY.

# Run a single bot locally (IDs are UPPERCASE: CHATBOT, CHILLI, COACH, WOLT, WORLDLY)
LOCAL_ACTIVE_BOT_ID=CHATBOT npm run dev
```

## Available Bots

| ID         | Description                                                                 |
|------------|-----------------------------------------------------------------------------|
| `CHATBOT`  | AI assistant with 30+ tools (weather, calendar, gmail, reminders, sports, github, polymarket, spotify, etc.) |
| `CHILLI`   | Persona bot — replies as the user's cat in Hebrew                           |
| `COACH`    | Sports analytics, predictions, schedules. Bundled mini-app (`apps/coach-web`) |
| `WOLT`     | Wolt restaurant availability watcher + notifications. Mini-app (`apps/wolt-web`) |
| `WORLDLY`  | Geography quiz / education. Mini-app (`apps/worldly-web`)                   |

Bot guides on the docs site: <https://matansocher.github.io/mmps/bots/overview>.

## Architecture

- **Node.js 24.x** runtime, **TypeScript 5.9** (non-strict, ES2022).
- **grammY** for Telegram. All bot code uses `@services/telegram`.
- **LangChain / LangGraph** for agent + tool orchestration; `MemorySaver` for per-thread checkpoints.
- **MongoDB** native driver (no ODM). Each bot has its own database (`chatbot-db`, `coach-db`, …).
- **Express 5** runs alongside the bots — Swagger UI, auth endpoints, optional mini-app data routes per bot.
- **Manual DI** via per-feature `init*` functions in `src/index.ts`.

Full architecture overview: <https://matansocher.github.io/mmps/architecture/overview>.

## Development

```bash
npm run dev                # tsx watch — local dev (single bot via LOCAL_ACTIVE_BOT_ID)
npm run dev:debug          # with --inspect
npm test                   # Jest
npm run lint               # ESLint
npm run lint:fix
npm run format             # Prettier
npm run build              # tsc + tsc-alias + mini-app builds
npm run docs:dev           # VitePress docs locally

# Mini-app workspaces
npm run dev:coach-web
npm run dev:worldly-web
npm run dev:wolt-web
```

### For AI agents (Claude Code, Copilot, Cursor, …)

`AGENTS.md` at the repo root is the canonical onboarding doc — conventions, patterns, file layout, env vars, common gotchas. `CLAUDE.md` and `.github/copilot-instructions.md` are symlinks to it, so all agents read the same source.

If you change conventions or architecture, **update `AGENTS.md`** (the symlinks pick it up automatically).

### GitHub AI workflows

Two labels in `.github/workflows/claude.yml` trigger automation:

- **`review`** on a PR → AI code review.
- **`implement`** on an issue → AI generates an implementation PR.

## Documentation

VitePress site at **<https://matansocher.github.io/mmps/>**:

- [Getting Started](https://matansocher.github.io/mmps/guide/getting-started)
- [Architecture](https://matansocher.github.io/mmps/architecture/overview)
- [Bot Guides](https://matansocher.github.io/mmps/bots/overview)
- [Development](https://matansocher.github.io/mmps/development/contributing)
- [Deployment](https://matansocher.github.io/mmps/deployment/production)
