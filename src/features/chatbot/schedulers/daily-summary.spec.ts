import type { Bot } from 'grammy';
import { ObjectId } from 'mongodb';
import { sendRichMessage } from '@services/telegram';
import { getTomorrowHourlyForecast } from '@services/weather';
import type { HourlyWeather, TomorrowForecast } from '@services/weather';
import { getTomorrowEvents } from '@shared/calendar-events';
import type { CalendarEvent } from '@shared/calendar-events';
import { getPendingRemindersDueOnOrBefore } from '@shared/reminders';
import type { Reminder } from '@shared/reminders';
import { dailySummary } from './daily-summary';

vi.mock('@services/telegram', () => ({ sendRichMessage: vi.fn() }));
vi.mock('@services/weather', () => ({ getTomorrowHourlyForecast: vi.fn() }));
vi.mock('@shared/calendar-events', () => ({ getTomorrowEvents: vi.fn() }));
vi.mock('@shared/reminders', () => ({ getPendingRemindersDueOnOrBefore: vi.fn() }));

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

function createEvent(summary: string, location?: string): CalendarEvent {
  return {
    _id: undefined as never,
    googleEventId: summary,
    summary,
    location,
    start: { dateTime: '2026-08-16T09:00:00+03:00' },
    end: { dateTime: '2026-08-16T10:00:00+03:00' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createReminder(message: string, dueDate: string): Reminder {
  return {
    _id: new ObjectId(),
    chatId: 1,
    message,
    dueDate: new Date(dueDate),
    status: 'pending',
    createdAt: new Date(),
  };
}

function lastSentForm(): Record<string, unknown> {
  return (vi.mocked(sendRichMessage).mock.calls.at(-1)![3] ?? {}) as Record<string, unknown>;
}

function lastSentMessage(): string {
  return vi.mocked(sendRichMessage).mock.calls.at(-1)![2];
}

describe('dailySummary()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPendingRemindersDueOnOrBefore).mockResolvedValue([]);
  });

  it('should fetch weather and calendar in parallel', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([]);

    await dailySummary(bot);

    expect(getTomorrowHourlyForecast).toHaveBeenCalledTimes(1);
    expect(getTomorrowEvents).toHaveBeenCalledTimes(1);
  });

  it('should render the weather section as a table of the four target hours', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue({ ...createForecast(), hourly: [createHour(9, 20), ...createForecast().hourly] });
    vi.mocked(getTomorrowEvents).mockResolvedValue([]);

    await dailySummary(bot);

    const message = lastSentMessage();
    expect(message).toContain('| Time | Temp | Conditions |');
    expect(message).toContain('| 10:00 | 28°C | Sunny |');
    expect(message).toContain('| 22:00 | 24°C | Sunny |');
    expect(message).not.toContain('09:00');
  });

  it('should render the calendar section as a table', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('Dentist', 'Weizmann 12')]);

    await dailySummary(bot);

    const message = lastSentMessage();
    expect(message).toContain('| Time | Event | Location |');
    expect(message).toContain('| 09:00-10:00 | Dentist | Weizmann 12 |');
  });

  it('should list a birthday once, in its own section and not in the calendar table', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('Standup'), createEvent('Dana birthday')]);

    await dailySummary(bot);

    const message = lastSentMessage();
    expect(message).toContain('🎂 Dana birthday');
    expect(message.match(/Dana birthday/g)).toHaveLength(1);
    expect(message).toContain('| 09:00-10:00 | Standup |  |');
  });

  it('should omit the birthdays section when there are none', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('Standup')]);

    await dailySummary(bot);

    expect(lastSentMessage()).not.toContain('Birthdays');
  });

  it('should not include a greeting or closing line', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('Standup')]);

    await dailySummary(bot);

    const message = lastSentMessage();
    expect(message).not.toContain('Good night');
    expect(message.startsWith('**🌤 Weather for tomorrow**')).toBe(true);
  });

  it('should separate every section heading from its table with a blank line', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('Standup'), createEvent('Dana birthday')]);

    await dailySummary(bot);

    const message = lastSentMessage();
    expect(message).toContain('**🌤 Weather for tomorrow**\n\n| Time |');
    expect(message).toContain('**📅 Calendar**\n\n| Time |');
    expect(message).toContain('**🎉 Birthdays**\n\n- 🎂');
  });

  it('should separate the fallback lines from their heading with a blank line', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue({ ...createForecast(), hourly: [] });
    vi.mocked(getTomorrowEvents).mockResolvedValue([]);

    await dailySummary(bot);

    const message = lastSentMessage();
    expect(message).toContain('**🌤 Weather for tomorrow**\n\nNot available');
    expect(message).toContain('**📅 Calendar**\n\nNothing scheduled');
  });

  it('should keep a multi-line event location on a single table row', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('Yoman', 'Zoom\nmeeting\n  id 123')]);

    await dailySummary(bot);

    expect(lastSentMessage()).toContain('| 09:00-10:00 | Yoman | Zoom meeting id 123 |');
  });

  it('should escape pipes coming from calendar text', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('BI weekly | backlog', 'Room | 2')]);

    await dailySummary(bot);

    expect(lastSentMessage()).toContain('| 09:00-10:00 | BI weekly \\| backlog | Room \\| 2 |');
  });

  it('should still send a summary when the forecast fails', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockRejectedValue(new Error('weather down'));
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('Standup')]);

    await dailySummary(bot);

    const message = lastSentMessage();
    expect(message).toContain('Not available');
    expect(message).toContain('Standup');
  });

  it('should render unfinished reminders as a table', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([]);
    vi.mocked(getPendingRemindersDueOnOrBefore).mockResolvedValue([createReminder('Call plumber', '2026-08-16T09:00:00+03:00')]);

    await dailySummary(bot);

    const message = lastSentMessage();
    expect(message).toContain('**⏰ Unfinished reminders**\n\n| Due | Reminder |');
    expect(message).toContain('| 2026-08-16 09:00 | Call plumber |');
  });

  it('should attach an inline keyboard with complete and snooze buttons per reminder', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([]);
    vi.mocked(getPendingRemindersDueOnOrBefore).mockResolvedValue([createReminder('Call plumber', '2026-08-16T09:00:00+03:00')]);

    await dailySummary(bot);

    const keyboard = (lastSentForm().reply_markup as { inline_keyboard?: unknown[][] } | undefined)?.inline_keyboard ?? [];
    const flat = keyboard.flat() as Array<Record<string, unknown>>;
    expect(flat.some((button) => button.text === '✅ Complete')).toBe(true);
    expect(flat.some((button) => button.text === '🌅 Snooze tomorrow')).toBe(true);
    expect(flat.some((button) => typeof button.text === 'string' && (button.text as string).includes('Call plumber'))).toBe(true);
  });

  it('should not attach an inline keyboard when there are no reminders', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([]);
    vi.mocked(getPendingRemindersDueOnOrBefore).mockResolvedValue([]);

    await dailySummary(bot);

    expect(lastSentForm().reply_markup).toBeUndefined();
  });

  it('should omit the reminders section when there are none', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([]);
    vi.mocked(getPendingRemindersDueOnOrBefore).mockResolvedValue([]);

    await dailySummary(bot);

    expect(lastSentMessage()).not.toContain('Unfinished reminders');
  });

  it('should escape pipes coming from reminder text', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([]);
    vi.mocked(getPendingRemindersDueOnOrBefore).mockResolvedValue([createReminder('Buy milk | eggs', '2026-08-16T09:00:00+03:00')]);

    await dailySummary(bot);

    expect(lastSentMessage()).toContain('| 2026-08-16 09:00 | Buy milk \\| eggs |');
  });

  it('should still send a summary when fetching reminders fails', async () => {
    vi.mocked(getTomorrowHourlyForecast).mockResolvedValue(createForecast());
    vi.mocked(getTomorrowEvents).mockResolvedValue([createEvent('Standup')]);
    vi.mocked(getPendingRemindersDueOnOrBefore).mockRejectedValue(new Error('mongo down'));

    await dailySummary(bot);

    const message = lastSentMessage();
    expect(message).toContain('Standup');
    expect(message).not.toContain('Unfinished reminders');
  });
});
