import pc from 'picocolors';
import { isProd } from '@core/config';
import { forwardLogToNewRelic } from '@core/observability';

type Level = 'LOG' | 'ERROR' | 'WARN' | 'DEBUG';

const levelColor: Record<Level, (s: string) => string> = {
  LOG: pc.green,
  ERROR: pc.red,
  WARN: pc.yellow,
  DEBUG: pc.cyan,
};

export class Logger {
  constructor(private context: string) {}

  log(message: string): void {
    console.log(this.format('LOG', message));
    forwardLogToNewRelic('LOG', this.context, message);
  }

  error(message: string): void {
    console.error(this.format('ERROR', message));
    forwardLogToNewRelic('ERROR', this.context, message);
  }

  warn(message: string): void {
    console.warn(this.format('WARN', message));
    forwardLogToNewRelic('WARN', this.context, message);
  }

  debug(message: string): void {
    console.debug(this.format('DEBUG', message));
  }

  private format(level: Level, message: string): string {
    const timestamp = new Date().toISOString();
    if (isProd) {
      return `${timestamp} | ${this.context} | ${message}`;
    }
    return `${timestamp} ${levelColor[level](level)} ${pc.dim(this.context)} ${message}`;
  }
}
