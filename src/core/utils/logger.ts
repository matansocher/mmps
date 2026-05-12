import pc from 'picocolors';
import { isProd } from '@core/config';

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
  }

  error(message: string): void {
    console.error(this.format('ERROR', message));
  }

  warn(message: string): void {
    console.warn(this.format('WARN', message));
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
