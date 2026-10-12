# Running Locally

Guide to running MMPS in different modes during development.

## Development Mode

The standard way to develop and test locally:

```bash
npm run dev
```

After [Doppler setup](/guide/environment-setup), this injects development secrets
and uses `tsx watch` to reload when code changes. No `.env` is needed in a fresh
worktree. Restart the command to fetch changed secrets.

For a manually maintained `.env`, use `npm run dev:manual` instead.

### Run a Specific Bot

By default, all bots run in production mode. In development, run one bot at a time:

```bash
LOCAL_ACTIVE_BOT_ID=CHATBOT npm run dev
```

Available bot IDs: `CHATBOT`, `CHILLI`, `COACH`, `WOLT`, `WORLDLY`, `LEARNER`.
Use a unique `PORT` for each concurrently running worktree.

### Watch Mode for TypeScript Only

If you want to compile TypeScript without running the app:

```bash
npm run dev:build
```

## Debug Mode

Enable Node.js debugging on port 9229:

```bash
npm run dev:debug
```

Then connect your debugger:

- **VS Code**: Press `Ctrl+Shift+D`, select Node.js from the dropdown
- **Chrome DevTools**: Open `chrome://inspect` and click inspect
- **WebStorm**: Run → Edit Configurations → Node.js

## Production Mode

Build and run the production version:

```bash
npm run build
npm start
```

This:
1. Compiles TypeScript to `dist/`
2. Resolves path aliases
3. Runs the compiled JavaScript

## Code Quality

Before committing, run these checks:

```bash
# Format code
npm run format

# Check formatting without changes
npm run format:check

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Run tests
npm test

# Watch tests
npm test:watch
```

## Testing Bots Locally

### Testing Chatbot Locally

1. Create a test Telegram bot with @BotFather
2. Add the token to Doppler `mmps/dev`: `PLAYGROUNDS_TELEGRAM_BOT_TOKEN=...`
3. Run: `LOCAL_ACTIVE_BOT_ID=CHATBOT npm run dev`
4. Open Telegram and find your bot
5. Send `/start` to begin testing

### Testing Multiple Bots

Run separate instances with different `PORT` values and active bot IDs.
Each concurrent polling instance needs a distinct playground token; use separate
development configs if necessary. Do not enable production mode to run multiple
bots locally.

## Troubleshooting

### Port or PID Already in Use

Stop any existing processes:

```bash
# Find and kill process on port
lsof -i :3000
kill -9 <PID>
```

### Bot Not Responding

1. Check the development config has the correct playground token and both mode flags
2. Verify MongoDB is running: `mongosh` should connect
3. Check console logs for errors
4. Ensure `LOCAL_ACTIVE_BOT_ID` is set correctly

### TypeScript Compilation Errors

```bash
npm run build    # See detailed errors
npm run lint     # Check for code style issues
```

### MongoDB Connection Failed

```bash
# Verify MongoDB is running
brew services list  # macOS
mongo --eval "db.adminCommand('ping')"

# Check MONGO_DB_URL in .env
# For local: mongodb://localhost:27017
# For Atlas: mongodb+srv://username:password@...
```

## Best Practices

1. **Use one bot at a time** - Set `LOCAL_ACTIVE_BOT_ID` to avoid resource conflicts
2. **Keep debug logs on** - They help identify issues quickly
3. **Test with a test bot** - Create dedicated test bots on Telegram
4. **Use `.env.local`** - Sensitive credentials in this file (add to .gitignore)

## Next Steps

- [Architecture Overview](/architecture/overview)
- [Testing Guide](/development/testing)
- [Contributing](/development/contributing)
