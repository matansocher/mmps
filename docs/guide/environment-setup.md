# Configuration

Complete guide to environment variables and configuration.

## Quick Setup

Copy the example file and edit with your values:

```bash
cp .env.example .env
# Edit .env with your API keys and bot tokens
```

## Doppler (recommended)

Instead of hand-managing a `.env` file across multiple machines, this repo is
wired up for [Doppler](https://www.doppler.com/). Doppler stores your secrets
centrally and the CLI downloads them into a local `.env` on demand, so every
machine you develop on stays in sync without copying secrets around.

### One-time install

```bash
# macOS (gnupg is required for signature verification)
brew install gnupg
brew install dopplerhq/cli/doppler

# verify
doppler --version
```

Other operating systems: see the [Doppler CLI install guide](https://docs.doppler.com/docs/install-cli).

### One-time per machine

```bash
# Authenticate the CLI with your Doppler workplace (opens a browser)
doppler login

# Select the mmps project + dev config for this repo.
# doppler.yaml pins the project/config, so this is non-interactive.
npm run doppler:setup

# Machine-specific values that must NOT be shared across machines
echo 'LOCAL_ACTIVE_BOT_ID=CHATBOT' > .env.local
```

### Two files, two owners

| File | Owner | Contents |
| --- | --- | --- |
| `.env` | Doppler | Shared secrets — bot tokens, API keys, `MONGO_DB_URL`. Rewritten from scratch on every `npm run dev`. |
| `.env.local` | You, per machine/worktree | `LOCAL_ACTIVE_BOT_ID`, `PORT`, any local override. Never touched by Doppler. |

`src/index.ts` loads them as `dotenv.config({ path: ['.env.local', '.env'] })`.
`dotenv` uses first-wins precedence, so `.env.local` overrides `.env` key by key
while `.env` supplies everything else.

That split is what makes the refresh safe: `.env` is a disposable cache of the
shared vault, and anything you need to differ per machine or per worktree lives
in `.env.local`, where a Doppler refresh can never clobber it. **Don't hand-edit
`.env`** — it is regenerated on every run.

Keep `LOCAL_ACTIVE_BOT_ID` out of the Doppler config entirely; every machine and
worktree wants a different bot. The download script warns if it sees that key
arrive from Doppler, and also warns when no `.env.local` exists.

### Day-to-day

```bash
# Just run the app as usual — the `predev` hook refreshes .env from Doppler first
npm run dev
npm run dev:debug   # same auto-refresh before the debugger boots

# Or refresh .env on demand without starting the app
npm run doppler:download
```

`npm run dev` and `npm run dev:debug` each trigger an npm `pre` hook that runs
`doppler:download` first, so `.env` is always current — there's no separate
command to remember.

The refresh is safe by design (`doppler-download.mjs`):

- it downloads to a temp file and only swaps it into `.env` on success, cleaning
  the temp file up either way;
- it refuses to overwrite `.env` when Doppler returns an empty payload;
- if the Doppler CLI isn't installed or you aren't set up, it prints a warning
  and continues with your existing `.env` — so a hand-managed `.env` still works;
- it never reads or writes `.env.local`.

Production (`npm start` / `npm run build`) is untouched and never calls Doppler;
deploys get secrets from the environment as usual.

### Replacing a machine

```bash
git clone … && npm install
doppler login
npm run doppler:setup
echo 'LOCAL_ACTIVE_BOT_ID=CHATBOT' > .env.local
npm run dev
```

Everything else arrives from Doppler on the first `npm run dev`.

::: tip
`.env`, `.env.local` and `.doppler/` are git-ignored. The `doppler.yaml` at the
repo root is committed and only records which project/config to use — never any
secret values.
:::

## Required Variables

These variables must be set for the application to run:

```bash
# MongoDB Connection
MONGO_DB_URL=mongodb://localhost:27017

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
LOCAL_ACTIVE_BOT_ID=CHATBOT

# Bot tokens for other bots
COACH_TELEGRAM_BOT_TOKEN=...
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
MONGO_DB_URL=mongodb://localhost:27017
```

### MongoDB Atlas (Cloud)

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get your connection string
4. Add it to `.env`

```bash
MONGO_DB_URL=mongodb+srv://username:password@cluster.mongodb.net/
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
npm run dev
```

Check the console logs to ensure the bot(s) started successfully.

## Next Steps

- [Running Locally](/guide/running-locally)
- [Architecture Overview](/architecture/overview)
- [Available Bots](/bots/overview)
