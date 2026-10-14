import { GrammyError, HttpError } from 'grammy';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTransientSendError, sendWithRetry } from './send-with-retry';

function grammyError(errorCode: number, description = 'boom', parameters: Record<string, unknown> = {}): GrammyError {
  const payload = { ok: false as const, error_code: errorCode, description, parameters };
  return new GrammyError('boom', payload, 'sendMessage', {});
}

function httpError(): HttpError {
  return new HttpError('network down', new Error('ECONNRESET'));
}

describe('isTransientSendError()', () => {
  test.each([
    { name: 'http transport error', error: httpError(), expected: true },
    { name: '429 rate limit', error: grammyError(429), expected: true },
    { name: '500 server error', error: grammyError(500), expected: true },
    { name: '502 bad gateway', error: grammyError(502), expected: true },
    { name: 'blocked by user', error: grammyError(403, 'Forbidden: bot was blocked by the user'), expected: false },
    { name: '400 bad request', error: grammyError(400), expected: false },
    { name: 'plain error', error: new Error('nope'), expected: false },
  ])('should return $expected for $name', ({ error, expected }) => {
    expect(isTransientSendError(error)).toEqual(expected);
  });
});

describe('sendWithRetry()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should retry a transient error and return the next successful result', async () => {
    const send = vi.fn().mockRejectedValueOnce(httpError()).mockResolvedValueOnce('sent');

    const promise = sendWithRetry(send);
    await vi.runAllTimersAsync();

    expect(await promise).toEqual('sent');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('should give up after 2 retries', async () => {
    const send = vi.fn().mockRejectedValue(httpError());

    const promise = sendWithRetry(send);
    const assertion = expect(promise).rejects.toThrow('network down');
    await vi.runAllTimersAsync();

    await assertion;
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('should not retry a permanent error', async () => {
    const send = vi.fn().mockRejectedValue(grammyError(403, 'Forbidden: bot was blocked by the user'));

    await expect(sendWithRetry(send)).rejects.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('should honor retry_after on 429', async () => {
    const send = vi.fn().mockRejectedValueOnce(grammyError(429, 'Too Many Requests', { retry_after: 3 })).mockResolvedValueOnce('sent');

    const promise = sendWithRetry(send);
    await vi.advanceTimersByTimeAsync(2999);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    expect(await promise).toEqual('sent');
    expect(send).toHaveBeenCalledTimes(2);
  });
});
