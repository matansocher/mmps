import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { listEvents } from '@services/google-calendar';
import type { CalendarEvent } from '@services/google-calendar';
import { getEventOutcomes } from '@services/polymarket';
import { parseMatchTeams, upcomingEventAlert } from './upcoming-event-alert';
import { findMatchEventSlug } from './utils';

vi.mock('@services/google-calendar', () => ({
  listEvents: vi.fn(),
}));
vi.mock('@services/polymarket', () => ({
  getEventOutcomes: vi.fn(),
}));
vi.mock('./utils', () => ({
  findMatchEventSlug: vi.fn(),
  formatMatchOdds: vi.fn(() => '📊 *Polymarket odds*\n🟢 Real Madrid CF: 67.5%'),
}));

const sendMessage = vi.fn();
const bot = { api: { sendMessage } } as unknown as Bot;

function createCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    summary: '⚽ Real Madrid vs Espanyol',
    start: { dateTime: '2026-08-22T22:30:00+03:00' },
    end: { dateTime: '2026-08-23T00:30:00+03:00' },
    extendedProperties: { private: { source: 'chatbot-sports-calendar' } },
    ...overrides,
  };
}

describe('parseMatchTeams()', () => {
  test.each([
    { summary: '⚽ Real Madrid vs Espanyol', expected: { homeTeam: 'Real Madrid', awayTeam: 'Espanyol' } },
    { summary: '⚽ Maccabi Haifa vs Hapoel Ramat Gan', expected: { homeTeam: 'Maccabi Haifa', awayTeam: 'Hapoel Ramat Gan' } },
  ])('should parse teams from $summary', ({ summary, expected }) => {
    expect(parseMatchTeams(summary)).toEqual(expected);
  });

  test.each([{ summary: 'Dentist appointment' }, { summary: '⚽ Training session' }, { summary: '' }])('should return null for $summary', ({ summary }) => {
    expect(parseMatchTeams(summary)).toEqual(null);
  });
});

describe('upcomingEventAlert()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-22T22:15:00+03:00'));
    sendMessage.mockReset();
    vi.mocked(listEvents).mockReset();
    vi.mocked(getEventOutcomes).mockReset();
    vi.mocked(findMatchEventSlug).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should append polymarket odds to a sports calendar match alert', async () => {
    vi.mocked(listEvents).mockResolvedValue([createCalendarEvent()]);
    vi.mocked(findMatchEventSlug).mockResolvedValue('lal-esp-rea-2026-08-22');
    vi.mocked(getEventOutcomes).mockResolvedValue({} as never);

    await upcomingEventAlert(bot);

    expect(findMatchEventSlug).toHaveBeenCalledWith('Real Madrid', 'Espanyol', new Date('2026-08-22T22:30:00+03:00'));
    expect(sendMessage).toHaveBeenCalledWith(MY_USER_ID, expect.stringContaining('📊 *Polymarket odds*'), { parse_mode: 'Markdown' });
  });

  it('should send the plain alert when no market is found', async () => {
    vi.mocked(listEvents).mockResolvedValue([createCalendarEvent()]);
    vi.mocked(findMatchEventSlug).mockResolvedValue(null);

    await upcomingEventAlert(bot);

    expect(getEventOutcomes).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith(MY_USER_ID, expect.not.stringContaining('Polymarket'), { parse_mode: 'Markdown' });
  });

  it('should send the plain alert when polymarket fails', async () => {
    vi.mocked(listEvents).mockResolvedValue([createCalendarEvent()]);
    vi.mocked(findMatchEventSlug).mockRejectedValue(new Error('503'));

    await upcomingEventAlert(bot);

    expect(sendMessage).toHaveBeenCalledWith(MY_USER_ID, expect.stringContaining('⚽ Real Madrid vs Espanyol'), { parse_mode: 'Markdown' });
    expect(sendMessage).toHaveBeenCalledWith(MY_USER_ID, expect.not.stringContaining('Polymarket'), { parse_mode: 'Markdown' });
  });

  it('should not look up odds for events not managed by the sports calendar', async () => {
    vi.mocked(listEvents).mockResolvedValue([createCalendarEvent({ summary: 'Dentist appointment', extendedProperties: undefined })]);

    await upcomingEventAlert(bot);

    expect(findMatchEventSlug).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('should not look up odds for a managed event whose title is not a fixture', async () => {
    vi.mocked(listEvents).mockResolvedValue([createCalendarEvent({ summary: '⚽ Training session' })]);

    await upcomingEventAlert(bot);

    expect(findMatchEventSlug).not.toHaveBeenCalled();
  });

  it('should skip cancelled events', async () => {
    vi.mocked(listEvents).mockResolvedValue([createCalendarEvent({ status: 'cancelled' })]);

    await upcomingEventAlert(bot);

    expect(sendMessage).not.toHaveBeenCalled();
  });
});
