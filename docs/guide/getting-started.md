# Getting Started

Welcome to MMPS! This guide will help you set up and run the application in just a few minutes.

## Prerequisites

- **Node.js 24.x** or later
- **npm** (comes with Node.js)
- A MongoDB instance (local or cloud-based)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/matansocher/mmps
cd mmps
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory and add your configuration:

```bash
# Application Mode
IS_PROD=false

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database
MONGO_URI=mongodb://localhost:27017

# Bot Tokens
CHATBOT_TELEGRAM_BOT_TOKEN=<your-chatbot-token>
COACH_TELEGRAM_BOT_TOKEN=<your-coach-token>
# ... other bot tokens

# Optional: Which bot to run in development
LOCAL_ACTIVE_BOT_ID=chatbot
```

See [Configuration](/guide/environment-setup) for a complete list of variables.

## Running the Application

### Development Mode

```bash
npm run start:dev
```

Or run a specific bot:

```bash
LOCAL_ACTIVE_BOT_ID=chatbot npm run start:dev
```

### Production Mode

Build and run:

```bash
npm run build
npm start
```

### Debug Mode

```bash
npm run start:debug
```

This enables Node.js debugging on port 9229.

## Next Steps

- **[Architecture Overview](/architecture/overview)** - Understand the system design
- **[Configuration Guide](/guide/environment-setup)** - Set up environment variables
- **[Available Bots](/bots/overview)** - Learn about each bot
- **[Contributing](/development/contributing)** - Start contributing

## Troubleshooting

### Port Already in Use

If you get an error about port being in use, check which bot is running in development mode.

### MongoDB Connection Error

Ensure MongoDB is running and `MONGO_URI` is correctly configured in your `.env` file.

### Missing API Keys

Some features require API keys. See the [Configuration Guide](/guide/environment-setup) for which keys are required.

## Finding Information

Can't find what you're looking for?

- **Use the search** - Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) to search across all documentation
- **Use the sidebar** - Navigate through different sections
- **Check related pages** - Each page has links to related topics
- **Search by keyword** - Try searching for specific features or bots
