# MMPS - Multi-Purpose Telegram Bots

This repository contains a TypeScript application that hosts multiple Telegram bots. Each bot is designed to handle specific tasks and interact with users through Telegram.

## Table of Contents
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Available Bots](#available-bots)
- [Architecture](#architecture)
- [License](#license)

## Getting Started
To run this application, ensure you have Node.js 20.x installed. Each bot operates independently and interacts with Telegram using the `node-telegram-bot-api` library.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/matansocher/mmps
   cd mmps
   ```
2. Install dependencies:
   ```bash
   npm i
   ```
3. Set up environment variables
   Create a .env file in the root directory and define the required environment variables:
   ```bash
   IS_PROD=false

   OPENAI_API_KEY=

   MONGO_DB_URL=

   LOCAL_ACTIVE_BOT_ID=#the id of the bot that you want to run (in BOT_CONFIG of each bot)
   PLAYGROUNDS_TELEGRAM_BOT_TOKEN=#a bot token to work with
   NOTIFIER_TELEGRAM_BOT_TOKEN=#another bot token to work with

   # Optional: Google Sheets Logging (Production only)
   # These credentials enable automatic logging of console output to Google Sheets
   SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
   SHEETS_LOGS_SPREADSHEET_ID=your-spreadsheet-id
   ```


## Running the Application

### Development
To start the application in development mode:

   ```bash
   npm run start:dev
   ```

### Production
To build and run in production:

   ```bash
   npm run build
   npm start
   ```

### Debug Mode
To start with debugging enabled:

   ```bash
   npm run start:debug
   ```

## Available Bots
- **Chatbot** - An AI-powered conversational bot with advanced features including reminders, weather updates, exercise tracking, and more
- **Coach** - Sports scheduler and predictions bot with game recommendations and betting value analysis
- **Langly** - Language learning assistant bot with daily challenges and vocabulary building
- **Magister** - Course progression bot with lesson reminders and learning management
- **Wolt** - Restaurant availability notifier for Wolt delivery service
- **Worldly** - Geography teacher and quiz bot with trivia challenges

## Architecture

This application uses a **plain TypeScript architecture** with manual dependency injection:

### Key Features
- **No framework overhead** - Direct TypeScript/Node.js application
- **Manual dependency injection** - Each feature has an `init()` function that sets up services, controllers, and schedulers
- **node-cron for scheduling** - Periodic tasks use `node-cron` with timezone support
- **MongoDB** - Native MongoDB driver for data persistence
- **AI Integration** - LangChain, Anthropic, and OpenAI for AI-powered features

### Project Structure
```
src/
├── core/           # Core utilities, config, mongo setup
├── features/       # Bot features (chatbot, coach, educator, etc.)
│   └── {name}/
│       ├── {name}.init.ts              # Initialization with manual DI
│       ├── {name}.controller.ts        # Telegram bot handlers
│       ├── {name}.service.ts           # Business logic
│       ├── {name}-scheduler.service.ts # Scheduled tasks
│       └── {name}.config.ts            # Bot configuration
├── services/       # External service integrations
├── shared/         # Shared business logic
└── main.ts         # Application entry point
```

### Conditional Bot Loading
The application supports running individual bots in development or all bots in production:

```typescript
// Set LOCAL_ACTIVE_BOT_ID to run a specific bot
LOCAL_ACTIVE_BOT_ID=chatbot npm run start:dev

// Or run all bots (production mode)
IS_PROD=true npm start
```

## License
This project is licensed under the MIT License.