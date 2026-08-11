import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createJsonRequester } from './request';

describe('createJsonRequester()', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws a contextual ApiError with a parsed JSON response body', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_input' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const request = createJsonRequester();
    const result = request('/api/items/42', { method: 'patch', body: JSON.stringify({ name: '' }) });

    await expect(result).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: 'ApiError',
        message: 'Request failed: PATCH /api/items/42 (422)',
        status: 422,
        body: { error: 'invalid_input' },
        method: 'PATCH',
        path: '/api/items/42',
      }),
    );
  });

  it('keeps a non-JSON error response body as text', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Service unavailable', { status: 503 }));

    const request = createJsonRequester();

    await expect(request('/api/health')).rejects.toMatchObject({
      status: 503,
      body: 'Service unavailable',
      method: 'GET',
      path: '/api/health',
    });
  });

  it('resolves empty successful responses as undefined', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    const request = createJsonRequester();

    await expect(request<void>('/api/session', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('applies current default headers and lets request headers override them', async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response(JSON.stringify({ success: true })));
    let initData = 'first';
    const request = createJsonRequester({
      headers: () => ({
        Accept: 'application/json',
        'X-Telegram-Init-Data': initData,
      }),
    });

    await request('/api/first', { method: 'POST', body: '{}' });
    initData = 'second';
    await request('/api/second', { headers: { Accept: 'text/plain' } });

    const firstInit = vi.mocked(fetch).mock.calls[0]?.[1];
    const secondInit = vi.mocked(fetch).mock.calls[1]?.[1];
    expect(new Headers(firstInit?.headers)).toEqual(
      new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': 'first',
      }),
    );
    expect(new Headers(secondInit?.headers)).toEqual(
      new Headers({
        Accept: 'text/plain',
        'X-Telegram-Init-Data': 'second',
      }),
    );
  });

  it('preserves configured credentials unless a request overrides them', async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response('{}'));
    const request = createJsonRequester({ credentials: 'include' });

    await request('/api/default');
    await request('/api/override', { credentials: 'omit' });

    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.credentials).toBe('include');
    expect(vi.mocked(fetch).mock.calls[1]?.[1]?.credentials).toBe('omit');
  });
});
