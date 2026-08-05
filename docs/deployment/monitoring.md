# Monitoring & Observability

MMPS ships traces, metrics, and logs to **Grafana Cloud** via **OpenTelemetry (OTLP)**. This gives Application Performance Monitoring (APM), searchable logs, and alerting on the free tier.

## How it works

Telemetry is bootstrapped through a Node.js `--import` preload so it is initialized **before** any application code runs.

- `src/core/telemetry/otel.ts` — builds the OpenTelemetry `NodeSDK` with three pipelines (traces, metrics, logs), all pointing at the same OTLP endpoint.
- `src/core/telemetry/register.ts` — the preload entry (`node --import ./dist/core/telemetry/register.js`) that calls `startTelemetry()`.
- `package.json` `start`/`debug` scripts wire the preload; the Heroku `Procfile` inherits it via `npm start`.

Local dev (`npm run dev`) uses `tsx watch`, which does **not** run the preload, so telemetry stays off locally. If `OTEL_EXPORTER_OTLP_ENDPOINT` is empty, `startTelemetry()` returns early and the app runs with no telemetry.

### Signals

| Signal | Exporter | What you get |
|--------|----------|--------------|
| Traces | `OTLPTraceExporter` + auto-instrumentations | Request/tool spans, latency, dependency map (Application Observability) |
| Metrics | `OTLPMetricExporter` (60s interval) | Runtime + HTTP metrics |
| Logs | `OTLPLogExporter` (batch) | Every `logger.log/error/warn/debug` as a log record, correlated with the active trace |

Log records are emitted by the `Logger` class (`src/core/utils/logger.ts`): in production each call also emits an OTEL log record (severity + `context` attribute) alongside the console output. Console output is unchanged.

### Auth

Grafana's OTLP gateway uses HTTP Basic auth. Rather than rely on the fragile `OTEL_EXPORTER_OTLP_HEADERS` env-var parsing, the header is built in code from `GRAFANA_OTLP_INSTANCE_ID` and `GRAFANA_OTLP_TOKEN`:

```
Authorization: Basic base64(<instanceID>:<token>)
```

## Configuration

Set these as Heroku config vars (Settings → Config Vars). They are **not** needed locally.

```bash
OTEL_SERVICE_NAME=mmps
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-<region>.grafana.net/otlp
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
GRAFANA_OTLP_INSTANCE_ID=<your instance id>
GRAFANA_OTLP_TOKEN=<your grafana cloud access token>
OTEL_DEBUG=            # set to "true" to log OTLP export attempts/errors while troubleshooting
```

The endpoint, instance ID, and token come from your Grafana Cloud stack's **OpenTelemetry** connection page. See [Environment Variables](/deployment/environment-variables#observability-grafana-cloud).

## Viewing telemetry in Grafana

- **APM / traces** — Application Observability, filter by `service_name="mmps"`.
- **Logs** — Explore → Loki data source, query `{service_name="mmps"}`. Add `| json | level="ERROR"` (or `|= "ERROR"`) to filter errors.
- **Metrics** — Explore → Prometheus data source.

## Alerting on errors

Alerts are configured in Grafana (no code). To notify on any error log:

1. **Contact point** — Alerts & IRM → Alerting → Contact points → add a **Telegram** integration (bot token + chat ID). Test it.
2. **Alert rule** — Alerts & IRM → Alerting → Alert rules → new rule:
   - Data source: the Loki logs source.
   - Query (Code mode):
     ```text
     count_over_time({service_name="mmps"} | json | level="ERROR" [5m])
     ```
     If the JSON `level` field is not detected, fall back to a raw match: `count_over_time({service_name="mmps"} |= "ERROR" [5m])`.
   - Condition: `IS ABOVE 0`.
   - Evaluation: 1m interval, 0s pending period (fire immediately).
   - Route to the Telegram contact point.

## Troubleshooting

- **`401 no credentials provided`** — the auth header is missing. Confirm `GRAFANA_OTLP_INSTANCE_ID` and `GRAFANA_OTLP_TOKEN` are set; the code builds the header from them.
- **`401 authentication error: invalid token`** — the header is being sent but the token/instance ID is wrong. Re-copy the token; verify with a direct curl to `<endpoint>/v1/traces`.
- **Traces/metrics work but no logs** — the logs pipeline needs the `OTLPLogExporter` (added in `otel.ts`). Confirm the deploy includes it.
- Set `OTEL_DEBUG=true` on Heroku to surface OTLP export attempts and errors in the app logs, then turn it off (verbose).

## Next Steps

- [Production Deployment](/deployment/production)
- [Environment Variables](/deployment/environment-variables)
