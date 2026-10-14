# Configuration

Complete guide to environment variables and configuration.

## Doppler setup (recommended)

Development secrets live in Doppler project `mmps`, config `dev`. Both computers
and their local AI worktrees use this same config. Production application secrets
live in `prd` and are delivered through Doppler's Heroku integration.

Install the [official CLI](https://docs.doppler.com/docs/cli) and authenticate once
on each computer:

```bash
brew install gnupg
brew install dopplerhq/cli/doppler
# Choose a parent covering your checkouts and worktrees.
# For the current ~/Projects layout:
doppler login --scope "$HOME/Projects"
```

Populate `dev` privately with only development-safe credentials. Set
`IS_PROD=false` and `NODE_ENV=development`; both are required by the local runner.
Use a development MongoDB/Redis and `PLAYGROUNDS_TELEGRAM_BOT_TOKEN`, not production
bot or database credentials. Put only the provider keys needed for the features
you exercise in this config. `.env.example` remains the value-free variable catalog.

From any worktree:

```bash
PORT=43101 LOCAL_ACTIVE_BOT_ID=CHATBOT npm run dev
npm run dev:debug
```

These scripts fetch secrets with explicit project/config flags before launching
Node, so a fresh worktree needs neither `.env` nor `doppler setup`. The committed
`doppler.yaml` is only a convenience for manual `doppler setup --no-interactive`.
The scripts do not write plaintext secret files and disable Doppler fallback
caching. A missing CLI, unavailable API, or failed authentication stops startup
instead of silently starting with missing or stale secrets.
The preload also rejects a Doppler environment other than `dev`, even if its
mode flags look like development. This prevents an accidentally supplied
production service token from starting the local app.

### First run on this computer

1. Use a checkout containing these scripts. Install Node 24 and run `npm ci` if
   dependencies have not been installed.
2. Create or verify `mmps/dev` in Doppler. Privately import development-safe values
   from your old local setup, set both mode flags above, and supply the resources
   required by the selected feature. The web features also initialize independently
   of bot selection, so account for their database requirements.
3. Install the CLI and authenticate as shown above. If your directories are not
   under `~/Projects`, scope the login to their actual common parent instead.
4. Run `PORT=43101 LOCAL_ACTIVE_BOT_ID=CHATBOT npm run dev`. Check initialization
   errors and exercise the selected feature. The root health response alone does
   not prove that database-backed features or bots initialized.

### Second computer and future worktrees

First obtain the code changes through the normal reviewed Git workflow. A local,
unpublished branch is not fetchable from another computer. Install Node 24 and the
CLI, run `npm ci`, and authenticate that computer with your same Doppler account.
There is no second secret import: `mmps/dev` is shared by both machines.

Each new worktree needs dependencies and its own local controls, but no `.env`
copy or directory-specific `doppler setup`. Its path must be covered by the
machine's login/service-token scope. Avoid concurrent polling with the same bot
token even across the two computers.

### Local controls and precedence

Use shell variables or an ignored `.env.local` for worktree-specific controls:

```dotenv
PORT=43101
LOCAL_ACTIVE_BOT_ID=CHATBOT
```

The CLI preserves existing shell values only for `PORT` and `LOCAL_ACTIVE_BOT_ID`.
Before application imports, the local preload reads optional `.env` and
`.env.local` files with overrides enabled. Precedence is:
**`.env.local` > `.env` > injected Doppler/shell values**.
Keys absent from both files retain their injected values.

For example, put `OPENAI_API_KEY=<local-development-key>` in your ignored `.env`
and run `npm run dev` normally. That key overrides Doppler without a command-line
assignment. Keep these files small: remove obsolete overrides so new vault values
can take effect. Do not copy a complete production `.env` into a worktree.
File values also override shell assignments; remove the file entry if you want
a shell assignment to win. Production `npm start` does not load either file.

Each worktree needs a different HTTP port. For concurrent debuggers:

```bash
doppler run --project mmps --config dev \
  --preserve-env=PORT,LOCAL_ACTIVE_BOT_ID --no-fallback -- \
  npx tsx watch --import ./local-env.mjs --inspect=127.0.0.1:9231 src/index.ts
```

Only one process can poll a given playground Telegram token. Distinct HTTP ports
do not solve bot-token conflicts; use separate development bots or the mock tests.

### AI sessions and access

AI sessions use the same development config as human runs. For restricted access,
provision a separate read-only `dev` [service token](https://docs.doppler.com/docs/service-tokens)
on each computer through your credential mechanism, outside Git and agent transcripts.
The official CLI supports persisting it at the common worktree-parent scope.
A service token's config takes precedence over project/config flags.

### Fresh AI-session checklist

- Read this guide; use the default development config, never `prd`.
- Check `doppler --version` without displaying credentials. If authentication
  is missing, ask the human to provision access; do not dump local CLI state.
- Install checkout dependencies if absent and choose an unused HTTP port.
- Start with `PORT=<unused-port> LOCAL_ACTIVE_BOT_ID=<UPPERCASE_ID> npm run dev`.
- Inspect initialization errors and verify the specific feature, not just `/`.
- Stop test-only app processes after validation. Never print secrets, read an
  existing `.env` into chat, or copy a main checkout's secret files into a worktree.

Directory scoping is not a security boundary. An agent running as your OS user may
also access your personal Doppler login. Strong separation requires a separate OS
user or isolated runtime exposing only development access. Never print environment
dumps or token values to diagnose authentication.

### Other commands

Builds and ordinary tests remain secret-free and do not invoke Doppler.
For real-provider chatbot evaluations, explicitly opt in:

```bash
npm run eval:chatbot:dev
```

Doppler-backed evaluations use the same `.env` and `.env.local` overrides.
They enforce the same development environment/mode checks and local-controls
preload as app startup.
The existing `eval:chatbot` command retains its manual dotenv setup.

For an approved standalone script requiring development secrets:

```bash
doppler run --project mmps --config dev --no-fallback -- npx tsx path/to/script.ts
```

Review a maintenance script's effects before running it. Re-launch the outer
Doppler command after editing secrets; a source-code reload inside `tsx watch`
does not fetch updated secrets.
Some existing maintenance scripts load dotenv themselves: wrapping them with
Doppler does not disable that loader. Review that path too, especially when a
checkout contains an old `.env`; do not allow missing development keys to be
filled with production credentials.

### Production: one-time Heroku connection

In Doppler's dashboard, connect `mmps/prd` to Heroku app `mmps` using the
[Heroku integration](https://docs.doppler.com/docs/heroku). Import the existing
application-owned config vars once, review conflicts, and then treat Doppler as
their source of truth. Set `IS_PROD=true` and `NODE_ENV=production` in `prd`.
Keep Heroku-assigned `PORT`, reserved metadata, and add-on-managed values owned
by Heroku. Imported add-on values are not kept updated back into Doppler.

Sync is one-way from Doppler to Heroku. Config changes create a Heroku release
and restart the application, so verify sync and feature health before revoking
old provider keys. `npm start`, the telemetry preload, and deployment scripts
do not fetch from Doppler; existing Heroku values remain usable during a Doppler
outage. The repository does not enable this account-side integration automatically.

When a value intentionally matches in both configs, use Doppler's save-time
multi-environment update. Automatic cross-config references require a paid plan.
Development credentials should normally differ from production.

### Adding or rotating secrets

Edit the intended config in Doppler. For a new variable, update the value-free
`.env.example` and feature-specific setup documentation. Re-launch local consumers
to fetch the new value. Production receives it only after the Heroku integration
is enabled and its sync succeeds. Verify the production release before revoking
the previous provider credential. Do not manually maintain a second application
secret copy in Heroku after adopting Doppler as its authority.

## Manual dotenv fallback

For explicitly offline/manual development:

```bash
cp .env.example .env
# Edit .env with your API keys and bot tokens
npm run dev:manual
# Or: npm run dev:manual:debug
```

The manual commands require `.env`, optionally load `.env.local`, and inject
configuration before imports. The preload gives `.env.local` precedence over
`.env`, and both files precedence over shell values, just like the Doppler path.
Both mode flags must still identify development. `npm start` expects process
environment variables and does not read dotenv files.

## Required Variables

These variables must be set for the application to run:

```bash
# MongoDB Connection
MONGO_DB_URL=mongodb://localhost:27017

# Application Mode
IS_PROD=false

# Environment mode and optional local bot selection
NODE_ENV=development
LOCAL_ACTIVE_BOT_ID=CHATBOT

# Playground token for the selected local bot
PLAYGROUNDS_TELEGRAM_BOT_TOKEN=<your-token>
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

The per-bot tokens below are production tokens. A selected local bot uses
`PLAYGROUNDS_TELEGRAM_BOT_TOKEN` instead.

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
4. Privately save the development bot token as `PLAYGROUNDS_TELEGRAM_BOT_TOKEN` in
   Doppler `mmps/dev` (or your manual `.env`).

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
4. Add the development connection string to Doppler `mmps/dev` (or your manual `.env`).

```bash
MONGO_DB_URL=mongodb+srv://username:password@cluster.mongodb.net/
```

## API Keys Setup

### OpenAI

1. Visit [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Privately add `OPENAI_API_KEY` to Doppler `mmps/dev` (or your manual `.env`).

### Anthropic

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Privately add `ANTHROPIC_API_KEY` to Doppler `mmps/dev` (or your manual `.env`).

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
