import { exit } from 'node:process';
import { Logger } from './logger';

let shuttingDown = false;
const HARD_TIMEOUT_MS = 10_000;

const shutdown = (logger: Logger, reason: string, err: unknown, close: () => Promise<void>, exitCode: number) => {
  if (shuttingDown) return;
  shuttingDown = true;
  if (exitCode === 0) {
    logger.log(`Shutting down gracefully on '${reason}'`);
  } else {
    logger.error(`Unhandled failure by '${reason}'! ${err instanceof Error ? err.message : String(err)}`);
  }

  const timer = setTimeout(() => {
    logger.error(`Hard-exiting after timeout by '${reason}'!`);
    exit(1);
  }, HARD_TIMEOUT_MS);
  timer.unref();

  close().finally(() => {
    clearTimeout(timer);
    exit(exitCode);
  });
};

export function gracefulShutdown(...closes: (() => Promise<unknown> | unknown)[]): void {
  const logger = new Logger('graceful-shutdown');
  const close = async () => {
    for (const fn of closes) {
      try {
        await fn();
      } catch (err) {
        logger.error(`An error occurred during graceful shutdown! ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  process
    .once('uncaughtException', (e) => shutdown(logger, 'uncaughtException', e, close, 1))
    .once('unhandledRejection', (r) => shutdown(logger, 'unhandledRejection', r, close, 1))
    .once('SIGTERM', () => shutdown(logger, 'SIGTERM', null, close, 0))
    .once('SIGINT', () => shutdown(logger, 'SIGINT', null, close, 0));
}
