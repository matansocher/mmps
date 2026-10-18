import { ApiError, errorCodeFromBody, request, requireAuthHeaders } from './api';
import type { PracticeAnswerSource, PracticeAttemptResponse, PracticeAttemptSummary, PracticeScope, PracticeScopeInfo, PracticeVerdict } from './practice';
import { createSseParser } from './sse';

const BASE = '/api/learner/practice';

type ListParams = { readonly before?: string; readonly limit?: number; readonly verdict?: PracticeVerdict };

type StreamHandlers = {
  readonly onDelta: (text: string) => void;
  readonly signal?: AbortSignal;
};

export const practiceApi = {
  scope: () => request<PracticeScopeInfo>(`${BASE}/scope`),

  start: (scope: PracticeScope) => request<PracticeAttemptResponse>(`${BASE}/attempts`, { method: 'POST', body: JSON.stringify({ scope }) }),

  list: ({ before, limit, verdict }: ListParams = {}) => {
    const params = new URLSearchParams();
    if (before) params.set('before', before);
    if (limit) params.set('limit', String(limit));
    if (verdict) params.set('verdict', verdict);
    const query = params.toString();
    return request<{ attempts: PracticeAttemptSummary[]; hasMore: boolean }>(`${BASE}/attempts${query ? `?${query}` : ''}`);
  },

  get: (id: string) => request<PracticeAttemptResponse>(`${BASE}/attempts/${encodeURIComponent(id)}`),

  answer: (id: string, answer: string, source: PracticeAnswerSource) =>
    request<PracticeAttemptResponse>(`${BASE}/attempts/${encodeURIComponent(id)}/answer`, { method: 'POST', body: JSON.stringify({ answer, source }) }),

  skip: (id: string) => request<PracticeAttemptResponse>(`${BASE}/attempts/${encodeURIComponent(id)}/skip`, { method: 'POST' }),

  transcribe: (audio: Blob) =>
    request<{ text: string }>(`${BASE}/transcribe`, {
      method: 'POST',
      body: audio,
      headers: { 'Content-Type': audio.type || 'audio/webm' },
    }),

  // Streams the tutor reply over SSE; resolves with the final persisted message.
  async streamMessage(id: string, content: string, { onDelta, signal }: StreamHandlers): Promise<{ content: string; createdAt: string }> {
    const response = await fetch(`${BASE}/attempts/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      signal,
      headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json', ...requireAuthHeaders() },
      body: JSON.stringify({ content }),
    });

    if (!response.ok || !response.body) {
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      throw new ApiError(response.status, errorCodeFromBody(body, response.status));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = createSseParser();
    let streamed = '';

    const handle = (event: string, data: string): { content: string; createdAt: string } | null => {
      const payload = JSON.parse(data) as { text?: string; content?: string; createdAt?: string; error?: string };
      if (event === 'delta' && payload.text) {
        streamed += payload.text;
        onDelta(payload.text);
      } else if (event === 'done') {
        return { content: payload.content ?? streamed, createdAt: payload.createdAt ?? new Date().toISOString() };
      } else if (event === 'error') {
        throw new ApiError(500, payload.error ?? 'stream_interrupted');
      }
      return null;
    };

    for (;;) {
      const { value, done } = await reader.read();
      const events = done ? parser.flush() : parser.push(decoder.decode(value, { stream: true }));
      for (const evt of events) {
        const result = handle(evt.event, evt.data);
        if (result) {
          reader.cancel().catch(() => {});
          return result;
        }
      }
      if (done) break;
    }
    throw new ApiError(500, 'stream_interrupted');
  },
};
