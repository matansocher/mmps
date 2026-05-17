# MMPS - Multi-Purpose Telegram Bots

A comprehensive TypeScript application hosting 6 AI-powered Telegram bots with clean architecture and zero framework overhead.

**📚 [Complete Documentation](https://matansocher.github.io/mmps/)** | **🤖 [6 Specialized Bots](#available-bots)** | **⚡ [Plain TypeScript](#architecture)**

## Quick Start

```bash
# Clone and setup
git clone https://github.com/matansocher/mmps
cd mmps
npm install

# Configure environment
# See https://matansocher.github.io/mmps/guide/environment-setup for details
cp .env.example .env

# Run a bot
LOCAL_ACTIVE_BOT_ID=chatbot npm run start:dev
```

## Available Bots

- **[Chatbot](https://matansocher.github.io/mmps/bots/chatbot)** - AI assistant with 20+ tools
- **[Coach](https://matansocher.github.io/mmps/bots/coach)** - Sports analytics & predictions
- **[Langly](https://matansocher.github.io/mmps/bots/langly)** - Language learning companion
- **[Magister](https://matansocher.github.io/mmps/bots/magister)** - Course management
- **[Wolt](https://matansocher.github.io/mmps/bots/wolt)** - Restaurant notifications
- **[Worldly](https://matansocher.github.io/mmps/bots/worldly)** - Geography education

## Architecture

- **Node.js 24.x** - Latest Node.js runtime
- **TypeScript 5.9** - Full type safety
- **Manual DI** - Explicit, simple dependency injection
- **MongoDB** - Native driver persistence
- **AI/LLM** - OpenAI, Anthropic, LangChain, LangGraph
- **grammY** - Modern Telegram bot framework

See [Architecture Guide](https://matansocher.github.io/mmps/architecture/overview) for details.

## Development

```bash
npm run start:dev         # Start bot in watch mode
npm test                  # Run tests
npm run lint              # Lint code
npm run format            # Format code
npm run build             # Build for production
```

See [Development Guide](https://matansocher.github.io/mmps/development/contributing) for more.

### GitHub AI Features

This repository includes automated AI-powered code review and implementation:

- **Pull Request Review** - Add the `review` label to any PR to get AI-powered code analysis
- **Issue Implementation** - Add the `implement` label to any issue to generate a pull request with code implementation

Both features are triggered by labels and configured in `.github/workflows/claude.yml`.

## Documentation

Full documentation available at: **https://matansocher.github.io/mmps/**

- **[Getting Started](https://matansocher.github.io/mmps/guide/getting-started)** - 5-minute setup
- **[Architecture](https://matansocher.github.io/mmps/architecture/overview)** - System design
- **[Bot Guides](https://matansocher.github.io/mmps/bots/overview)** - Individual bot docs
- **[Development](https://matansocher.github.io/mmps/development/contributing)** - Contributing guide
- **[Deployment](https://matansocher.github.io/mmps/deployment/production)** - Production setup

## Stacker Mini App

The Stacker bot launches a Telegram Mini App webview (React + Vite SPA served by the MMPS Express process).

Production setup:

1. Deploy MMPS with `STACKER_TELEGRAM_BOT_TOKEN` and `STACKER_MINI_APP_URL=https://<host>/stacker/` in env.
2. In BotFather, configure the Stacker bot's Menu Button: `/setmenubutton` → pick `@your_stacker_bot` → text `Play Stacker` → URL `https://<host>/stacker/`.
3. Verify `https://<host>/stacker/` loads the SPA and `https://<host>/api/stacker/topics` returns JSON when called with a valid `X-Telegram-Init-Data` header.

Local dev:

```bash
# Terminal A — backend (API + bot)
STACKER_DEV_AUTH=1 LOCAL_ACTIVE_BOT_ID=STACKER STACKER_TELEGRAM_BOT_TOKEN=<token> npm run dev

# Terminal B — Vite SPA with HMR
VITE_DEV_USER_ID=999 npm run dev:stacker-web

# Open http://localhost:5173/stacker/
```

For real device testing inside Telegram: `cloudflared tunnel --url http://localhost:3000` and point BotFather's Mini App URL at the tunnel.

## License

MIT