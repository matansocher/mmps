# Environment Variables

Complete reference for all MMPS environment variables.

## Required Variables

### MongoDB
```bash
MONGO_DB_URL=mongodb://localhost:27017
# or
MONGO_DB_URL=mongodb+srv://user:pass@cluster.mongodb.net/
```

### Application
```bash
IS_PROD=false  # Set to true in production
```

### At Least One Bot Token
```bash
CHATBOT_TELEGRAM_BOT_TOKEN=123456789:ABCDefg...
```

## Optional Variables by Bot

### Chatbot
```bash
OPENAI_API_KEY=sk-...              # For ChatGPT
ANTHROPIC_API_KEY=sk-ant-...       # For Claude
GITHUB_TOKEN=ghp_...               # GitHub integration
WEATHERAPI_KEY=...                 # Weather data

# Conversation memory tuning (optional; defaults in code)
CHATBOT_SUMMARY_TRIGGER_MESSAGES=40  # summarize once a thread passes this many messages
CHATBOT_SUMMARY_KEEP_MESSAGES=20     # recent messages kept verbatim after summarizing
CHATBOT_USAGE_TRACKING=false         # disable per-turn token/cost metering (default on)
```

### Coach
```bash
COACH_TELEGRAM_BOT_TOKEN=...
SCORES_365_API_KEY=...
```

### Other Bots
```bash
WOLT_TELEGRAM_BOT_TOKEN=...
WORLDLY_TELEGRAM_BOT_TOKEN=...
```

## Production Variables

### Google Sheets Logging
```bash
SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
SHEETS_LOGS_SPREADSHEET_ID=your-spreadsheet-id
```

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
