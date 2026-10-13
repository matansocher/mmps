import axios, { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Logger } from '@core/utils';
import { getEarthquakesAboveMagnitude, getRecentEarthquakes } from './api';
import type { Earthquake } from './types';

const NOW = new Date('2026-10-13T12:00:00Z');
const QUERY_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

function earthquake(id: string, mag: number, minutesBack: number): Earthquake {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [35, 32, 10] },
    properties: {
      mag,
      time: NOW.getTime() - minutesBack * 60_000,
      place: 'Test',
      updated: NOW.getTime(),
      tz: null,
      url: '',
      detail: '',
      felt: null,
      cdi: null,
      mmi: null,
      alert: null,
      status: 'reviewed',
      tsunami: 0,
      sig: 0,
      net: 'us',
      code: id,
      ids: id,
      sources: 'us',
      types: 'origin',
      nst: null,
      dmin: null,
      rms: 0,
      gap: null,
      magType: 'mw',
      type: 'earthquake',
      title: 'Test',
    },
  };
}

function axiosError(code?: string, status?: number): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response = status ? { status, statusText: '', headers: {}, config, data: {} } : undefined;
  return new AxiosError('USGS unavailable', code, config, undefined, response);
}

describe('USGS earthquake requests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('uses the feed and filters before applying the limit', async () => {
    const older = earthquake('older', 5, 12);
    const latest = earthquake('latest', 4, 1);
    const get = vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: { features: [earthquake('small', 3, 0), earthquake('old', 7, 16), older, latest, earthquake('future', 8, -1)] },
    });

    expect(await getRecentEarthquakes({ limit: 1 })).toEqual([latest]);
    expect(get).toHaveBeenCalledExactlyOnceWith(FEED_URL, { params: undefined, timeout: 10_000 });
  });

  test.each([
    { orderBy: 'time', ids: ['newest', 'middle', 'oldest'] },
    { orderBy: 'time-asc', ids: ['oldest', 'middle', 'newest'] },
    { orderBy: 'magnitude', ids: ['oldest', 'newest', 'middle'] },
    { orderBy: 'magnitude-asc', ids: ['middle', 'newest', 'oldest'] },
  ] as const)('preserves $orderBy ordering', async ({ orderBy, ids }) => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: { features: [earthquake('middle', 4, 5), earthquake('oldest', 7, 10), earthquake('newest', 6, 1)] },
    });

    expect((await getRecentEarthquakes({ orderBy })).map((quake) => quake.id)).toEqual(ids);
  });

  test('includes time and magnitude boundaries and respects endTime', async () => {
    const boundary = earthquake('boundary', 5, 15);
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: { features: [boundary, earthquake('end', 5, 5), earthquake('newer', 6, 4), earthquake('below', 4.9, 10)] },
    });

    expect((await getRecentEarthquakes({ minMagnitude: 5, endTime: new Date(NOW.getTime() - 5 * 60_000) })).map((quake) => quake.id)).toEqual(['end', 'boundary']);
  });

  test('excludes unreported magnitudes even when the requested minimum is negative', async () => {
    const quake = earthquake('known', -1, 5);
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: { features: [{ ...quake, id: 'unknown', properties: { ...quake.properties, mag: null } }, quake] },
    });
    expect(await getRecentEarthquakes({ minMagnitude: -2 })).toEqual([quake]);
  });

  test('leaves invalid options to query API validation', async () => {
    const get = vi.spyOn(axios, 'get').mockRejectedValue(axiosError(undefined, 400));
    await expect(getRecentEarthquakes({ minMagnitude: 11 })).rejects.toThrow('USGS unavailable');
    expect(get).toHaveBeenCalledWith(QUERY_URL, expect.anything());
  });

  test('keeps historical query parameters and magnitude helper behavior', async () => {
    const quake = earthquake('historical', 6, 25 * 60);
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { features: [quake] } });

    expect(await getEarthquakesAboveMagnitude(5, 48)).toEqual([quake]);
    expect(get).toHaveBeenCalledExactlyOnceWith(QUERY_URL, {
      params: { format: 'geojson', starttime: '2026-10-11T12:00:00.000Z', minmagnitude: '5', orderby: 'magnitude', limit: '50' },
      timeout: 10_000,
    });
  });

  test('uses the feed for a 24-hour magnitude request', async () => {
    const quake = earthquake('strong', 7, 60);
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { features: [earthquake('small', 4, 1), quake] } });

    expect(await getEarthquakesAboveMagnitude(5)).toEqual([quake]);
    expect(get).toHaveBeenCalledWith(FEED_URL, expect.anything());
  });

  test('preserves historical endTime in custom queries', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { features: [] } });

    await getRecentEarthquakes({ startTime: new Date('2026-10-01'), endTime: new Date('2026-10-02') });
    expect(get).toHaveBeenCalledWith(QUERY_URL, expect.objectContaining({ params: expect.objectContaining({ endtime: '2026-10-02T00:00:00.000Z' }) }));
  });

  test.each([
    { name: 'timeout', error: axiosError('ECONNABORTED') },
    { name: 'connection reset', error: axiosError('ECONNRESET') },
    { name: 'DNS timeout', error: axiosError('EAI_AGAIN') },
    { name: 'HTTP timeout', error: axiosError(undefined, 408) },
    { name: 'rate limit', error: axiosError(undefined, 429) },
    { name: 'upstream failure', error: axiosError(undefined, 503) },
  ])('retries a $name and recovers', async ({ error }) => {
    const quake = earthquake('recovered', 6, 1);
    const get = vi
      .spyOn(axios, 'get')
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ status: 200, data: { features: [quake] } });

    const promise = getRecentEarthquakes();
    await vi.advanceTimersByTimeAsync(499);
    expect(get).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    expect(await promise).toEqual([quake]);
    expect(get).toHaveBeenCalledTimes(2);
    expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('retrying in 500ms'));
  });

  test.each([15, 48 * 60])('gives up after three attempts for a %i-minute range', async (minutesBack) => {
    const error = axiosError('ETIMEDOUT');
    const get = vi.spyOn(axios, 'get').mockRejectedValue(error);
    const assertion = expect(getRecentEarthquakes({ startTime: new Date(NOW.getTime() - minutesBack * 60_000) })).rejects.toBe(error);
    await vi.advanceTimersByTimeAsync(500);
    expect(get).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(999);
    expect(get).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);

    await assertion;
    expect(get).toHaveBeenCalledTimes(3);
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('attempt 3, code ETIMEDOUT'));
  });

  test.each([400, 401, 404, 501])('does not retry HTTP %i', async (status) => {
    const error = axiosError(undefined, status);
    const get = vi.spyOn(axios, 'get').mockRejectedValue(error);

    await expect(getRecentEarthquakes()).rejects.toBe(error);
    expect(get).toHaveBeenCalledTimes(1);
  });

  test('does not retry cancellation', async () => {
    const get = vi.spyOn(axios, 'get').mockRejectedValue(axiosError('ERR_CANCELED'));
    await expect(getRecentEarthquakes()).rejects.toThrow('USGS unavailable');
    expect(get).toHaveBeenCalledTimes(1);
  });

  test('rejects malformed responses rather than reporting no earthquakes', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: {} });
    await expect(getRecentEarthquakes()).rejects.toThrow('Invalid USGS response');
    expect(get).toHaveBeenCalledTimes(1);
  });

  test('accepts a valid empty feed without retrying', async () => {
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { features: [] } });
    expect(await getRecentEarthquakes()).toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
