import axios from 'axios';
import { env } from 'node:process';
import { JEV_BASE_URL, JEV_MODEL, JEV_TIMEOUT_MS } from './constants';
import type { JevNoulQuestion, JevRequest, JevResponse } from './types';

const NOUL_KEY = 'answer';

// Returns the probability (0-1) that the answer to the yes/no question is "yes".
export async function askJevNoul(state: string, question: Omit<JevNoulQuestion, 'type'>): Promise<number> {
  const apiKey = env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error('TypeSafe API key not configured');
  }

  const body: JevRequest = { model: JEV_MODEL, state, questions: { [NOUL_KEY]: { type: 'noul', ...question } } };
  const response = await axios.post<JevResponse>(`${JEV_BASE_URL}/systemone`, body, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: JEV_TIMEOUT_MS,
  });

  const probability = response.data?.answers?.[NOUL_KEY]?.noul;
  if (typeof probability !== 'number') {
    throw new Error('TypeSafe returned no noul answer');
  }
  return probability;
}
