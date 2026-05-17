import { initData } from './telegram';
import type {
  AnswerResponse,
  MeResponse,
  NextQuestionResponse,
  StartSessionResponse,
  TopicsResponse,
  Topic,
  Level,
} from '../types';

const DEV_USER_ID = import.meta.env.DEV ? import.meta.env.VITE_DEV_USER_ID : undefined;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  if (initData) headers['X-Telegram-Init-Data'] = initData;
  else if (DEV_USER_ID) headers['X-Stacker-Dev-User'] = String(DEV_USER_ID);

  const res = await fetch(`/api${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: () => apiFetch<MeResponse>('/stacker/me'),
  topics: () => apiFetch<TopicsResponse>('/stacker/topics'),
  startSession: (topic: Topic, level: Level) =>
    apiFetch<StartSessionResponse>('/stacker/sessions', {
      method: 'POST',
      body: JSON.stringify({ topic, level }),
    }),
  nextQuestion: (sessionId: string) =>
    apiFetch<NextQuestionResponse>(`/stacker/sessions/${sessionId}/next`),
  answer: (sessionId: string, body: { questionId: string; selectedOption?: number; text?: string }) =>
    apiFetch<AnswerResponse>(`/stacker/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  abandon: (sessionId: string) =>
    apiFetch<{ ok: true }>(`/stacker/sessions/${sessionId}/abandon`, { method: 'POST' }),
};
