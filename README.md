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

## Documentation

Full documentation available at: **https://matansocher.github.io/mmps/**

- **[Getting Started](https://matansocher.github.io/mmps/guide/getting-started)** - 5-minute setup
- **[Architecture](https://matansocher.github.io/mmps/architecture/overview)** - System design
- **[Bot Guides](https://matansocher.github.io/mmps/bots/overview)** - Individual bot docs
- **[Development](https://matansocher.github.io/mmps/development/contributing)** - Contributing guide
- **[Deployment](https://matansocher.github.io/mmps/deployment/production)** - Production setup

## License

MIT