import { exit } from 'node:process';
import { Logger } from './logger';

let shuttingDown = false;
const HARD_TIMEOUT_MS = 10_000;

const shutdown = (logger: Logger, reason: string, err: unknown, close: () => Promise<void>) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.error(`Unhandled failure by '${reason}'! ${err}`);

  const timer = setTimeout(() => {
    logger.error(`Hard-exiting after timeout by '${reason}'!`);
    exit(1);
  }, HARD_TIMEOUT_MS);
  timer.unref();

  close().finally(() => {
    clearTimeout(timer);
    exit(1);
  });
};

export function gracefulShutdown(...closes: (() => Promise<unknown> | unknown)[]): void {
  const logger = new Logger('graceful-shutdown');
  const close = async () => {
    for (const fn of closes) {
      try {
        await fn();
      } catch (err) {
        logger.error(`An error occurred during graceful shutdown! ${err}`);
      }
    }
  };

  process
    .once('uncaughtException', (e) => shutdown(logger, 'uncaughtException', e, close))
    .once('unhandledRejection', (r) => shutdown(logger, 'unhandledRejection', r, close))
    .once('SIGTERM', () => shutdown(logger, 'SIGTERM', new Error('SIGTERM'), close))
    .once('SIGINT', () => shutdown(logger, 'SIGINT', new Error('SIGINT'), close));
}
