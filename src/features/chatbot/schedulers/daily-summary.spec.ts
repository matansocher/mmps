import type { Bot } from 'grammy';
import { getResponse } from '@services/openai';
import { sendShortenedMessage } from '@services/telegram';
import { getTomorrowHourlyForecast } from '@services/weather';
import type { HourlyWeather, TomorrowForecast } from '@services/weather';
import { getTomorrowEvents } from '@shared/calendar-events';
import type { CalendarEvent } from '@shared/calendar-events';
import { dailySummary } from './daily-summary';

vi.mock('@services/openai', () => ({ getResponse: vi.fn() }));
vi.mock('@services/telegram', () => ({ sendShortenedMessage: vi.fn() }));
vi.mock('@services/weather', () => ({ getTomorrowHourlyForecast: vi.fn() }));
vi.mock('@shared/calendar-events', () => ({ getTomorrowEvents: vi.fn() }));

const bot = { api: { sendMessage: vi.fn() } } as unknown as Bot;

function createHour(hour: number, temperature: number): HourlyWeather {
  return {
    time: `2026-08-16 ${String(hour).padStart(2, '0')}:00`,
    hour,
    temperature,
    feelsLike: temperature,
    condition: 'Sunny',
    conditionCode: 1000,
    humidity: 50,
    windSpeed: 10,
    chanceOfRain: 0,
    willItRain: false,
  };
}

function createForecast(): TomorrowForecast {
  return {
    location: 'Kfar Saba',
    coords: { lat: 32.17, lon: 34.9 },
    date: '2026-08-16',
    hourly: [createHour(10, 28), createHour(14, 31), createHour(18, 29), createHour(22, 24)],
  };
}

function createEvent(summary: string): CalendarEvent {
  return {
    _id: undefined as never,
    googleEventId: summary,
    summary,
    start: { dateTime: '2026-08-16T09:00:00+03:00' },
    end: { dateTime: '2026-08-16T10:00:00+03:00' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function lastSentMessage(): string {
  return vi.mocked(sendShortenedMessage).mock.calls.at(-1)![2];
}

describe('dailySummary()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getResponse).mockResolvedValue({ id: 'x', result: { greeting: '🌙 Good night!', closing: 'Rest up.' } });
  });

  it('should fetch weather and calendar in parallel', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([]);

    await dailySummary(bot);

    expect(getTomorrowHourlyForecast).toHaveBeenCalledTimes(1);
    expect(getTomorrowEvents).toHaveBeenCalledTimes(1);
  });

  it('should include only the four target hours in the weather section', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue({ ...createForecast(), hourly: [createHour(9, 20), ...createForecast().hourly] });
    vi.mocked(getTomorrowEvents).mockResolvedValue([]);

    await dailySummary(bot);

    const message = lastSentMessage();
    expect(message).toContain('10:00 - 28°C');
    expect(message).toContain('22:00 - 24°C');
    expect(message).not.toContain('09:00');
  });

  it('should add a birthdays section when a birthday event exists', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('Dana birthday')]);

    await dailySummary(bot);

    expect(lastSentMessage()).toContain('🎂 Dana birthday');
  });

  it('should omit the birthdays section when there are none', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('Standup')]);

    await dailySummary(bot);

    expect(lastSentMessage()).not.toContain('Birthdays');
  });

  it('should still send a summary when the forecast fails', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockRejectedValue(new Error('weather down'));
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('Standup')]);

    await dailySummary(bot);

    const message = lastSentMessage();
    expect(message).toContain('Not available');
    expect(message).toContain('Standup');
  });

  it('should fall back to static framing when the LLM call fails', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([]);
    vi.mocked(getResponse).mockRejectedValue(new Error('openai down'));

    await dailySummary(bot);

    expect(lastSentMessage()).toContain('🌙 Good night!');
  });
});
