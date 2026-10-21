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
npm ci
```

### 3. Configure Environment Variables

Follow [Configuration](/guide/environment-setup) to install Doppler, authenticate
this computer, and populate `mmps/dev` with development-safe credentials.
The same config works in both computers and all authenticated local worktrees;
no `.env` copy is required. The guide also documents the explicit manual dotenv
fallback, mode flags, and Heroku synchronization.

## Running the Application

### Development Mode

```bash
npm run dev
```

Or run a specific bot:

```bash
PORT=43101 LOCAL_ACTIVE_BOT_ID=CHATBOT npm run dev
```

### Production Mode

Build and run:

```bash
npm run build
npm start
```

### Debug Mode

```bash
npm run dev:debug
```

This enables Node.js debugging on port 9229.

## Next Steps

- **[Architecture Overview](/architecture/overview)** - Understand the system design
- **[Configuration Guide](/guide/environment-setup)** - Set up environment variables
- **[Available Bots](/bots/overview)** - Learn about each bot
- **[Contributing](/development/contributing)** - Start contributing (includes AI-powered code review and implementation)

## Troubleshooting

### Port Already in Use

If you get an error about port being in use, check which bot is running in development mode.

### MongoDB Connection Error

Ensure MongoDB is running and `MONGO_DB_URL` is correctly configured in Doppler
`mmps/dev` (or `.env` when explicitly using `npm run dev:manual`).

### Missing API Keys

Some features require API keys. See the [Configuration Guide](/guide/environment-setup) for which keys are required.

## Finding Information

Can't find what you're looking for?

- **Use the search** - Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) to search across all documentation
- **Use the sidebar** - Navigate through different sections
- **Check related pages** - Each page has links to related topics
- **Search by keyword** - Try searching for specific features or bots
