# Environment Variables

Complete reference for all MMPS environment variables.

## Required Variables

### MongoDB
```bash
MONGO_URI=mongodb://localhost:27017
# or
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/
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
```

### Coach
```bash
COACH_TELEGRAM_BOT_TOKEN=...
SCORES_365_API_KEY=...
```

### Other Bots
```bash
LANGLY_TELEGRAM_BOT_TOKEN=...
MAGISTER_TELEGRAM_BOT_TOKEN=...
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

## Development

Create `.env` file in root:

```bash
# .env
IS_PROD=false
MONGO_URI=mongodb://localhost:27017
LOCAL_ACTIVE_BOT_ID=chatbot
CHATBOT_TELEGRAM_BOT_TOKEN=...
OPENAI_API_KEY=...
```

## Next Steps

- [Production Deployment](/deployment/production)
- [Monitoring](/deployment/monitoring)
