# Environment Variables

Key MMPS environment variables, grouped by area. The complete, commented list is [`.env.example`](https://github.com/matansocher/mmps/blob/main/.env.example) — every variable the code reads is listed there.

## Required Variables

### MongoDB
```bash
MONGO_DB_URL=mongodb://localhost:27017
# or
MONGO_DB_URL=mongodb+srv://user:pass@cluster.mongodb.net/
```

### Application
```bash
IS_PROD=false                 # Set to true in production (boots all bots)
LOCAL_ACTIVE_BOT_ID=CHATBOT   # Local only: CHATBOT | CHILLI | COACH | WOLT | WORLDLY | LEARNER
PORT=3000                     # Defaults to 3000
MMPS_BASE_URL=https://...     # Public base URL used for mini-app links (defaults to the Heroku app)
REDIS_URL=redis://...         # Optional; rate limiting and caching fall back to memory without it
```

### At Least One Bot Token
```bash
CHATBOT_TELEGRAM_BOT_TOKEN=123456789:ABCDefg...
```

## Optional Variables by Bot

### Chatbot
```bash
OPENAI_API_KEY=sk-...              # For ChatGPT
GITHUB_APP_ID=...                  # GitHub App authentication
GITHUB_APP_PRIVATE_KEY=...         # GitHub App private key
GITHUB_APP_INSTALLATION_ID=...     # GitHub App installation ID
WEATHERAPI_KEY=...                 # Weather data

# Conversation memory tuning (optional; defaults in code)
CHATBOT_SUMMARY_TRIGGER_TOKENS=24000  # summarize once retained history passes this many tokens (primary bound)
CHATBOT_SUMMARY_TRIGGER_MESSAGES=40  # also summarize once a thread passes this many messages (OR; needs 2x KEEP_TOKENS)
CHATBOT_SUMMARY_KEEP_TOKENS=8000     # recent tokens kept verbatim after summarizing
CHATBOT_USAGE_TRACKING=false         # disable per-turn token/cost metering (default on)
CHATBOT_MODEL_CALL_LIMIT=            # max model requests per turn
CHATBOT_TOOL_CALL_LIMIT=             # max tool calls per turn
CHATBOT_TURN_TIMEOUT_MS=             # wall-clock deadline per turn
CHATBOT_SUMMARY_LOCATION=Kfar Saba   # location for the nightly summary's weather section
```

Tool integrations (Google Calendar/Maps/Places, Spotify, IGDB, RapidAPI, X/Twitter, Supadata, Imgur) and the social-digest video/image settings are listed with comments in `.env.example`.

### Coach
```bash
COACH_TELEGRAM_BOT_TOKEN=...
```

### Other Bots
```bash
CHILLI_TELEGRAM_BOT_TOKEN=...
WOLT_TELEGRAM_BOT_TOKEN=...
WOLT_RELAY_URL=...                 # Optional relay for the Wolt restaurants fetch
WORLDLY_TELEGRAM_BOT_TOKEN=...
LEARNER_TELEGRAM_BOT_TOKEN=...
NOTIFIER_TELEGRAM_BOT_TOKEN=...    # Cross-bot admin notifications
```

### Web Features
```bash
SAVINGS_APP_PASSWORD=...           # Shared password for /savings
CALENDAR_SYNC_SECRET=...           # Secret for POST /api/calendar-events/sync
```

### WhatsApp Webhook
```bash
WHATSAPP_TOKEN=...        # Meta Graph API access token
PHONE_NUMBER_ID=...       # WhatsApp Business phone number id
VERIFY_TOKEN=...          # Any string; must match the Meta dashboard verify token
WHATSAPP_APP_SECRET=...   # Optional; enables X-Hub-Signature-256 validation
WHATSAPP_ALLOWED_PHONES=...  # Optional; comma-separated allowlist (empty = everyone)
```

## Production Variables

### Observability (Grafana Cloud)
Ships traces, metrics, and logs to Grafana Cloud via OpenTelemetry. Set only in production (Heroku); leave `OTEL_EXPORTER_OTLP_ENDPOINT` empty to disable locally. Values come from your Grafana Cloud stack's **OpenTelemetry** connection page.

```bash
OTEL_SERVICE_NAME=mmps
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-<region>.grafana.net/otlp
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
GRAFANA_OTLP_INSTANCE_ID=your-instance-id       # username for OTLP Basic auth
GRAFANA_OTLP_TOKEN=your-grafana-access-token     # password for OTLP Basic auth
OTEL_DEBUG=                                       # "true" to log OTLP export attempts while troubleshooting
```

The Basic auth header is built in code from `GRAFANA_OTLP_INSTANCE_ID` + `GRAFANA_OTLP_TOKEN`. See [Monitoring & Observability](/deployment/monitoring).

## Development

Create `.env` file in root:

```bash
# .env
IS_PROD=false
MONGO_DB_URL=mongodb://localhost:27017
LOCAL_ACTIVE_BOT_ID=CHATBOT
CHATBOT_TELEGRAM_BOT_TOKEN=...
OPENAI_API_KEY=...
```

## Next Steps

- [Production Deployment](/deployment/production)
- [Monitoring](/deployment/monitoring)
