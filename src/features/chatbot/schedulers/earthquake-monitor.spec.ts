import { Bot } from 'grammy';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Logger } from '@core/utils';
import { getRecentEarthquakes } from '@services/earthquake-api';
import { earthquakeMonitor, LOOKBACK_MINUTES } from './earthquake-monitor';

vi.mock('@services/earthquake-api', () => ({
  getRecentEarthquakes: vi.fn(async () => []),
  shouldNotifyAboutEarthquake: vi.fn(),
  formatEarthquake: vi.fn(),
}));

vi.mock('@services/earthquake-map', () => ({ generateEarthquakeMapImage: vi.fn() }));
vi.mock('@services/telegram', () => ({ sendShortenedMessage: vi.fn() }));

describe('earthquakeMonitor()', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test('keeps the 15-minute schedule and overlaps the lookback for feed refresh delay', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-13T12:00:00Z'));
    const bot = new Bot('123:test');
    const sendPhoto = vi.spyOn(bot.api, 'sendPhoto');

    await earthquakeMonitor(bot);

    expect(LOOKBACK_MINUTES).toEqual(15);
    expect(getRecentEarthquakes).toHaveBeenCalledExactlyOnceWith({
      startTime: new Date('2026-10-13T11:43:00Z'),
      orderBy: 'time',
      limit: 50,
    });
    expect(sendPhoto).not.toHaveBeenCalled();
  });

  test('logs exhausted request failures without sending an alert', async () => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    vi.mocked(getRecentEarthquakes).mockRejectedValueOnce(new Error('USGS unavailable'));

    await earthquakeMonitor(new Bot('123:test'));

    expect(errorLog).toHaveBeenCalledWith('Failed to check earthquakes: USGS unavailable');
  });
});
