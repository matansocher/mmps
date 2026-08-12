import type { Bot } from 'grammy';
import type { Message } from 'grammy/types';
import { createEvent, deleteEvent, listEvents, updateEvent } from '@services/google-calendar';
import type { CalendarEvent } from '@services/google-calendar';
import { getCompetitionTable, getUpcomingMatches } from '@services/scores-365';
import type { UpcomingMatch } from '@services/scores-365';
import { sendShortenedMessage } from '@services/telegram';
import { sportsCalendar } from './sports-calendar';

vi.mock('@services/google-calendar', () => ({
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  listEvents: vi.fn(),
  updateEvent: vi.fn(),
}));
vi.mock('@services/scores-365', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@services/scores-365')>()),
  getCompetitionTable: vi.fn(),
  getUpcomingMatches: vi.fn(),
}));
vi.mock('@services/telegram', () => ({
  sendShortenedMessage: vi.fn(),
}));

const bot = {} as Bot;

function createMatch(overrides: Partial<UpcomingMatch> = {}): UpcomingMatch {
  return {
    id: 123,
    sourceCompetitionId: 11,
    competitionId: 11,
    competitionName: 'LaLiga',
    startTime: '2026-08-15T20:30:00+03:00',
    venue: 'Bernabéu',
    homeTeam: { id: 131, name: 'Real Madrid' },
    awayTeam: { id: 999, name: 'Opponent' },
    remainingHomeMatches: 20,
    remainingAwayMatches: 20,
    ...overrides,
  };
}

function createManagedEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-123',
    summary: '⚽ Real Madrid vs Opponent',
    description: 'LaLiga',
    location: 'Old stadium',
    start: { dateTime: '2026-08-15T18:30:00.000Z', timeZone: 'Asia/Jerusalem' },
    end: { dateTime: '2026-08-15T20:30:00.000Z', timeZone: 'Asia/Jerusalem' },
    extendedProperties: {
      private: {
        source: 'chatbot-sports-calendar',
        scores365MatchId: '123',
        scores365CompetitionId: '11',
      },
    },
    ...overrides,
  };
}

describe('sportsCalendar()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-12T07:00:00.000Z'));
    vi.mocked(getCompetitionTable).mockResolvedValue({
      competition: { id: 42, name: 'Premier League', icon: '🇮🇱' },
      competitionTable: [],
    });
    vi.mocked(listEvents).mockResolvedValue([]);
    vi.mocked(createEvent).mockImplementation(async (event) => ({ ...event, id: 'created' }));
    vi.mocked(updateEvent).mockImplementation(async (_eventId, event) => event as CalendarEvent);
    vi.mocked(deleteEvent).mockResolvedValue();
    vi.mocked(sendShortenedMessage).mockResolvedValue({} as Message.TextMessage);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create a provider-backed calendar event without invoking AI', async () => {
    vi.mocked(getUpcomingMatches).mockResolvedValue([createMatch()]);

    await sportsCalendar(bot);

    expect(getUpcomingMatches).toHaveBeenCalledWith('2026-08-12', '2026-08-15');
    expect(createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: '⚽ Real Madrid vs Opponent',
        description: 'LaLiga',
        extendedProperties: {
          private: {
            source: 'chatbot-sports-calendar',
            scores365MatchId: '123',
            scores365CompetitionId: '11',
          },
        },
      }),
    );
  });

  it('should update a rescheduled fixture and remove stale managed events', async () => {
    vi.mocked(getUpcomingMatches).mockResolvedValue([createMatch()]);
    vi.mocked(listEvents).mockResolvedValue([
      createManagedEvent(),
      createManagedEvent({
        id: 'stale',
        summary: '⚽ Cancelled vs Match',
        extendedProperties: { private: { source: 'chatbot-sports-calendar', scores365MatchId: '999', scores365CompetitionId: '11' } },
      }),
    ]);

    await sportsCalendar(bot);

    expect(updateEvent).toHaveBeenCalledWith('event-123', expect.objectContaining({ location: 'Bernabéu' }));
    expect(deleteEvent).toHaveBeenCalledWith('stale');
    expect(createEvent).not.toHaveBeenCalled();
  });

  it('should not mutate the calendar when fixture retrieval fails', async () => {
    vi.mocked(getUpcomingMatches).mockRejectedValue(new Error('provider unavailable'));

    await sportsCalendar(bot);

    expect(createEvent).not.toHaveBeenCalled();
    expect(updateEvent).not.toHaveBeenCalled();
    expect(deleteEvent).not.toHaveBeenCalled();
    expect(sendShortenedMessage).not.toHaveBeenCalled();
  });

  it('should still sync favorite-team matches when standings retrieval fails', async () => {
    vi.mocked(getUpcomingMatches).mockResolvedValue([createMatch()]);
    vi.mocked(getCompetitionTable).mockRejectedValue(new Error('standings unavailable'));

    await sportsCalendar(bot);

    expect(createEvent).toHaveBeenCalledTimes(1);
  });
});
