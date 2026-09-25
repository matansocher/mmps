import axios, { type AxiosResponse } from 'axios';
import { Logger, sleep } from '@core/utils';

const logger = new Logger('Scores365');

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;
// 365Scores normally answers in well under a second; a short per-attempt timeout leaves room to retry.
const REQUEST_TIMEOUT_MS = 10_000;
const TRANSIENT_ERROR_CODES = new Set(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'EPIPE', 'ENOTFOUND', 'ERR_NETWORK']);

export function isTransientScoresError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const status = error.response?.status;
  if (status !== undefined) {
    return status === 408 || status === 429 || (status >= 500 && status !== 501);
  }
  return TRANSIENT_ERROR_CODES.has(error.code ?? '');
}

// All 365Scores calls are idempotent GETs, so timeouts, dropped connections, 429 and 5xx are retried.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- same untyped default as axios.get
export async function scores365Get<T = any>(url: string): Promise<AxiosResponse<T>> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await axios.get<T>(url, { timeout: REQUEST_TIMEOUT_MS });
    } catch (err) {
      if (attempt >= MAX_RETRIES || !isTransientScoresError(err)) {
        throw err;
      }
      logger.warn(`Request failed (${axios.isAxiosError(err) ? (err.code ?? err.response?.status) : err}), retrying ${attempt + 1}/${MAX_RETRIES}: ${url}`);
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }
}
