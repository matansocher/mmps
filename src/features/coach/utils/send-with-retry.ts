import { GrammyError, HttpError } from 'grammy';
import { sleep } from '@core/utils';
import { BLOCKED_ERROR } from '@services/telegram';

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 4000;

// Telegram sends fail two ways worth retrying: transport hiccups (grammY HttpError) and
// server-side 429/5xx (GrammyError). A user blocking the bot or bad request is permanent.
export function isTransientSendError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return true;
  }
  if (error instanceof GrammyError) {
    if (error.description.includes(BLOCKED_ERROR)) {
      return false;
    }
    return error.error_code === 429 || error.error_code >= 500;
  }
  return false;
}

function getRetryDelayMs(error: unknown, attempt: number): number {
  if (error instanceof GrammyError && error.error_code === 429 && error.parameters?.retry_after) {
    return error.parameters.retry_after * 1000;
  }
  return Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
}

// Retries a Telegram delivery on transient errors so a rate-limit or network blip doesn't
// silently drop a user's daily update. Permanent errors (blocked bot, bad request) bubble up.
export async function sendWithRetry<T>(send: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await send();
    } catch (err) {
      if (attempt >= MAX_RETRIES || !isTransientSendError(err)) {
        throw err;
      }
      await sleep(getRetryDelayMs(err, attempt));
    }
  }
}
