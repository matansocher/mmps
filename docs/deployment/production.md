# Production Deployment

Guide to deploying MMPS to production.

## Pre-Deployment Checklist

- ✅ All tests pass: `npm test`
- ✅ Code lints: `npm run lint`
- ✅ Build succeeds: `npm run build`
- ✅ No secrets in code
- ✅ Environment variables configured
- ✅ Database backup in place
- ✅ Monitoring set up

## Building for Production

```bash
# Build TypeScript
npm run build

# Verify build
npm start

# Check logs for errors
```

## Environment Variables

Set all required variables in production:

```bash
# Application
IS_PROD=true

# MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Bot Tokens
CHATBOT_TELEGRAM_BOT_TOKEN=...
COACH_TELEGRAM_BOT_TOKEN=...
# ... all bot tokens

# Google Sheets Logging
SHEETS_CLIENT_EMAIL=...
SHEETS_PRIVATE_KEY=...
SHEETS_LOGS_SPREADSHEET_ID=...
```

## Running in Production

### Using Node

```bash
npm start
```

### Using PM2

```bash
# Install globally
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name mmps

# Monitor
pm2 monit

# View logs
pm2 logs mmps
```

### Using Docker

```bash
# Build image
docker build -t mmps .

# Run container
docker run -e MONGO_URI=... -e OPENAI_API_KEY=... mmps
```

## Monitoring & Logging

### Google Sheets Logging

Logs are automatically sent to Google Sheets in production:

```typescript
// Configure service account
SHEETS_CLIENT_EMAIL=...@iam.gserviceaccount.com
SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
SHEETS_LOGS_SPREADSHEET_ID=your-spreadsheet-id
```

### Log Levels

- `log()` - General info
- `warn()` - Warnings
- `error()` - Errors
- `debug()` - Debug info (dev only)

### Monitoring Checklist

- Monitor error rates
- Check API rate limits
- Monitor MongoDB connections
- Track bot response times
- Monitor memory usage

## Scaling

For high traffic:

1. **Load Balancing** - Run multiple instances behind a load balancer
2. **Database Replication** - Use MongoDB Atlas for managed replication
3. **Caching** - Implement Redis for frequently accessed data
4. **Scheduled Jobs** - Consider separate process for schedulers

## Backup & Recovery

### MongoDB Backups

```bash
# Manual backup
mongodump --uri "mongodb+srv://..." --out ./backup

# Restore from backup
mongorestore ./backup
```

### Using MongoDB Atlas

- Automated backups enabled by default
- Point-in-time restore available
- Scheduled backup snapshots

## Troubleshooting

### Bot Not Responding

1. Check bot token: `curl -X GET https://api.telegram.org/bot{TOKEN}/getMe`
2. Check MongoDB: `mongosh "mongodb+srv://..."`
3. Check logs: `pm2 logs mmps`

### Memory Leak

```bash
# Monitor memory usage
pm2 monit

# Restart on memory threshold
pm2 set mmps restart_delay 3600000
```

### Rate Limiting

- Implement exponential backoff
- Cache API responses
- Use bulk operations

## Next Steps

- [Monitoring & Logging](/deployment/monitoring)
- [Environment Variables](/deployment/environment-variables)
- [Contributing](/development/contributing)
