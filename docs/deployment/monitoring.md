# Monitoring & Logging

Monitoring and logging setup for production.

## Google Sheets Logging

In production, logs are automatically sent to Google Sheets.

### Setup

1. Create Google Cloud service account
2. Create spreadsheet
3. Share spreadsheet with service account email
4. Set environment variables:

```bash
SHEETS_CLIENT_EMAIL=...@iam.gserviceaccount.com
SHEETS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
SHEETS_LOGS_SPREADSHEET_ID=spreadsheet-id
```

### Log Levels

```typescript
logger.log('Info message');      // General info
logger.warn('Warning message');   // Warnings
logger.error('Error message');    // Errors
logger.debug('Debug message');    // Debug (dev only)
```

## Monitoring Metrics

### Key Metrics

- **Response Time** - Bot response latency
- **Error Rate** - Percentage of failed requests
- **API Rate Limits** - External API usage
- **Memory Usage** - Process memory consumption
- **Database Connections** - MongoDB connection pool

### Using PM2

```bash
# Monitor all processes
pm2 monit

# Save monitoring data
pm2 save
pm2 resurrect
```

### Alerting

Set up alerts for:
- Error rate > 5%
- Response time > 5s
- Memory usage > 80%
- Database connection failures

## Health Checks

Implement health check endpoint:

```bash
curl http://localhost:3000/health
# Returns: { status: 'ok', uptime: 3600 }
```

## Troubleshooting

### Memory Leak

1. Monitor: `pm2 monit`
2. Check for unclosed connections
3. Review MongoDB operations
4. Restart if necessary: `pm2 restart mmps`

### High CPU Usage

1. Check active tasks: `top`
2. Review logs for errors
3. Check API rate limiting
4. Optimize database queries

### Database Issues

1. Check connection: `mongosh "..."`
2. Monitor connection pool
3. Check indexes
4. Review slow queries

## Next Steps

- [Production Deployment](/deployment/production)
- [Environment Variables](/deployment/environment-variables)
