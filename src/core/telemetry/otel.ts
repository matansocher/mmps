import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { env } from 'node:process';

let sdk: NodeSDK | null = null;

function buildAuthHeaders(): Record<string, string> | undefined {
  const { GRAFANA_OTLP_INSTANCE_ID, GRAFANA_OTLP_TOKEN } = env;
  if (!GRAFANA_OTLP_INSTANCE_ID || !GRAFANA_OTLP_TOKEN) return undefined;
  const credentials = Buffer.from(`${GRAFANA_OTLP_INSTANCE_ID}:${GRAFANA_OTLP_TOKEN}`).toString('base64');
  return { Authorization: `Basic ${credentials}` }; // built in code to avoid fragile OTEL_EXPORTER_OTLP_HEADERS parsing
}

export function startTelemetry(): void {
  if (sdk) return;
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) return; // not configured — stay silent (local dev / no observability)

  if (env.OTEL_DEBUG === 'true') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG); // surfaces OTLP export attempts/errors in logs
  }

  const headers = buildAuthHeaders();

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME || 'mmps',
    [ATTR_SERVICE_VERSION]: env.npm_package_version || '1.0.0',
  });

  sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({ headers }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ headers }),
      exportIntervalMillis: 60_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy for this workload
      }),
    ],
  });

  sdk.start();

  const shutdown = async (): Promise<void> => {
    try {
      await sdk?.shutdown();
    } catch {
      // ignore shutdown errors — process is exiting anyway
    }
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
