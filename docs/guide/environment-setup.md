# Configuration

Complete guide to environment variables and configuration.

## Quick Setup

Copy the example file and edit with your values:

```bash
cp .env.example .env
# Edit .env with your API keys and bot tokens
```

## Required Variables

These variables must be set for the application to run:

```bash
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017

# Application Mode
IS_PROD=false

# At least one bot token
CHATBOT_TELEGRAM_BOT_TOKEN=<your-token>
```

## Optional Variables

### OpenAI Integration (Chatbot)

```bash
OPENAI_API_KEY=sk-...
```

### Anthropic Integration (Chatbot)

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

### Google Sheets Logging (Production only)

```bash
SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
SHEETS_LOGS_SPREADSHEET_ID=your-spreadsheet-id
```

### Development Configuration

```bash
# Run a specific bot in development
LOCAL_ACTIVE_BOT_ID=chatbot

# Bot tokens for other bots
COACH_TELEGRAM_BOT_TOKEN=...
LANGLY_TELEGRAM_BOT_TOKEN=...
MAGISTER_TELEGRAM_BOT_TOKEN=...
WOLT_TELEGRAM_BOT_TOKEN=...
WORLDLY_TELEGRAM_BOT_TOKEN=...
```

## Environment Variables by Bot

### Chatbot

```bash
CHATBOT_TELEGRAM_BOT_TOKEN=required
OPENAI_API_KEY=required for AI features
ANTHROPIC_API_KEY=optional, alternative to OpenAI
GITHUB_TOKEN=optional, for GitHub integration
WEATHERAPI_KEY=optional, for weather features
```

### Coach

```bash
COACH_TELEGRAM_BOT_TOKEN=required
SCORES_365_API_KEY=required for sports data
```

### Langly

```bash
LANGLY_TELEGRAM_BOT_TOKEN=required
```

### Magister

```bash
MAGISTER_TELEGRAM_BOT_TOKEN=required
```

### Wolt

```bash
WOLT_TELEGRAM_BOT_TOKEN=required
```

### Worldly

```bash
WORLDLY_TELEGRAM_BOT_TOKEN=required
```

## Getting Telegram Bot Tokens

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the prompts to create a new bot
4. Copy the bot token and add it to your `.env` file

## MongoDB Setup

### Local MongoDB

Install MongoDB Community Edition from [mongodb.com](https://www.mongodb.com/try/download/community)

```bash
# On macOS with Homebrew
brew install mongodb-community
brew services start mongodb-community

# Connection string
MONGO_URI=mongodb://localhost:27017
```

### MongoDB Atlas (Cloud)

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get your connection string
4. Add it to `.env`

```bash
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

## API Keys Setup

### OpenAI

1. Visit [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Add to `.env`: `OPENAI_API_KEY=sk-...`

### Anthropic

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

## .env Example File

See `.env.example` in the repository for a complete template with all available variables and their purposes.

## Verification

After setting up your environment variables, verify the configuration:

```bash
npm run build    # TypeScript should compile
npm run lint     # No linting errors
npm test         # Tests should pass
```

Then start the application:

```bash
npm run start:dev
```

Check the console logs to ensure the bot(s) started successfully.

## Next Steps

- [Running Locally](/guide/running-locally)
- [Architecture Overview](/architecture/overview)
- [Available Bots](/bots/overview)
