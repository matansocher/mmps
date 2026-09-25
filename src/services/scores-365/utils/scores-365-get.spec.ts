import axios, { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTransientScoresError, scores365Get } from './scores-365-get';

function axiosError(code?: string, status?: number): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response = status ? { status, statusText: '', headers: {}, config, data: {} } : undefined;
  return new AxiosError('boom', code, config, undefined, response);
}

describe('isTransientScoresError()', () => {
  test.each([
    { name: 'timeout', error: axiosError('ECONNABORTED'), expected: true },
    { name: 'connection reset', error: axiosError('ECONNRESET'), expected: true },
    { name: '429', error: axiosError(undefined, 429), expected: true },
    { name: '503', error: axiosError(undefined, 503), expected: true },
    { name: '501', error: axiosError(undefined, 501), expected: false },
    { name: '404', error: axiosError(undefined, 404), expected: false },
    { name: 'non-axios error', error: new Error('bad data'), expected: false },
  ])('should return $expected for $name', ({ error, expected }) => {
    expect(isTransientScoresError(error)).toEqual(expected);
  });
});

describe('scores365Get()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should retry a timeout and return the next successful response', async () => {
    const get = vi
      .spyOn(axios, 'get')
      .mockRejectedValueOnce(axiosError('ECONNABORTED'))
      .mockResolvedValueOnce({ data: { games: [] } });

    const promise = scores365Get('https://example.com');
    await vi.runAllTimersAsync();

    expect((await promise).data).toEqual({ games: [] });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('should give up after 2 retries', async () => {
    const get = vi.spyOn(axios, 'get').mockRejectedValue(axiosError('ECONNABORTED'));

    const promise = scores365Get('https://example.com');
    const assertion = expect(promise).rejects.toThrow('boom');
    await vi.runAllTimersAsync();

    await assertion;
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-transient errors', async () => {
    const get = vi.spyOn(axios, 'get').mockRejectedValue(axiosError(undefined, 404));

    await expect(scores365Get('https://example.com')).rejects.toThrow('boom');
    expect(get).toHaveBeenCalledTimes(1);
  });
});
