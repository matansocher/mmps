import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { env } from 'node:process';
import { sleep } from '@core/utils';
import { JEV_BASE_URL, JEV_MODEL, JEV_RETRY_DELAY_MS, JEV_RETRY_STATUSES, JEV_TIMEOUT_MS } from './constants';
import type { JevNoulQuestion, JevRequest, JevResponse } from './types';

const NOUL_KEY = 'answer';

function isRetryable(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status !== undefined && JEV_RETRY_STATUSES.includes(status);
}

async function post(body: JevRequest, apiKey: string): Promise<AxiosResponse<JevResponse>> {
  return axios.post<JevResponse>(`${JEV_BASE_URL}/systemone`, body, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: JEV_TIMEOUT_MS,
  });
}

// Retries once on 429 (rate limit) / 529 (overloaded), as recommended by the TypeSafe docs.
async function postWithRetry(body: JevRequest, apiKey: string): Promise<AxiosResponse<JevResponse>> {
  try {
    return await post(body, apiKey);
  } catch (err) {
    if (!isRetryable(err)) {
      throw err;
    }
    await sleep(JEV_RETRY_DELAY_MS);
    return post(body, apiKey);
  }
}

// Returns the probability (0-1) that the answer to the yes/no question is "yes".
export async function askJevNoul(state: string, question: Omit<JevNoulQuestion, 'type'>): Promise<number> {
  const apiKey = env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error('TypeSafe API key not configured');
  }

  const body: JevRequest = { model: JEV_MODEL, state, questions: { [NOUL_KEY]: { type: 'noul', ...question } } };
  const response = await postWithRetry(body, apiKey);

  const probability = response.data?.answers?.[NOUL_KEY]?.noul;
  if (typeof probability !== 'number') {
    throw new Error('TypeSafe returned no noul answer');
  }
  return probability;
}
