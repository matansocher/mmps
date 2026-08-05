import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import pc from 'picocolors';
import { isProd } from '@core/config';

type Level = 'LOG' | 'ERROR' | 'WARN' | 'DEBUG';

const levelColor: Record<Level, (s: string) => string> = {
  LOG: pc.green,
  ERROR: pc.red,
  WARN: pc.yellow,
  DEBUG: pc.cyan,
};

const levelSeverity: Record<Level, SeverityNumber> = {
  LOG: SeverityNumber.INFO,
  ERROR: SeverityNumber.ERROR,
  WARN: SeverityNumber.WARN,
  DEBUG: SeverityNumber.DEBUG,
};

export class Logger {
  constructor(private context: string) {}

  log(message: string): void {
    console.log(this.format('LOG', message));
    this.emit('LOG', message);
  }

  error(message: string): void {
    console.error(this.format('ERROR', message));
    this.emit('ERROR', message);
  }

  warn(message: string): void {
    console.warn(this.format('WARN', message));
    this.emit('WARN', message);
  }

  debug(message: string): void {
    console.debug(this.format('DEBUG', message));
    this.emit('DEBUG', message);
  }

  private emit(level: Level, message: string): void {
    if (!isProd) return; // logs pipeline only runs in prod (Heroku via the OTEL preload)
    logs.getLogger('mmps').emit({
      severityNumber: levelSeverity[level],
      severityText: level,
      body: message,
      attributes: { context: this.context, message }, // duplicated as an attribute so Loki exposes it as structured metadata for alert templating
    });
  }

  private format(level: Level, message: string): string {
    const timestamp = new Date().toISOString();
    if (isProd) {
      return JSON.stringify({ timestamp, level, context: this.context, message }); // single-line JSON for Loki parsing
    }
    return `${timestamp} ${levelColor[level](level)} ${pc.dim(this.context)} ${message}`;
  }
}
