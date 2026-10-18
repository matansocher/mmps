import { format } from 'date-fns';
import { getGamesByDate } from '@services/scores-365';
import type { ScoresGame } from '@services/scores-365';
import { getDashboardPreferences } from '@shared/coach';
import { CoachDashboardService } from './dashboard.service';

vi.mock('@services/scores-365', async (importOriginal) => ({ ...(await importOriginal<object>()), getGamesByDate: vi.fn() }));
vi.mock('./scores-cache', () => ({
  getCachedGameDetails: vi.fn().mockResolvedValue(null),
  getCachedGameStats: vi.fn().mockResolvedValue(null),
  getCachedHeadToHead: vi.fn().mockResolvedValue(null),
  getCachedLiveOdds: vi.fn().mockResolvedValue(null),
  getCachedStandings: vi.fn().mockResolvedValue(null),
  getCachedCompetitionTeamIds: vi.fn().mockResolvedValue([]),
}));
vi.mock('@shared/coach', async (importOriginal) => ({ ...(await importOriginal<object>()), getDashboardPreferences: vi.fn(), getSubscription: vi.fn() }));

const NOW = new Date('2026-10-17T15:00:00Z');

function mockPreferences(byUser: Record<number, { competitionIds: number[]; favoriteTeams?: { id: number; name: string }[] }>) {
  vi.mocked(getDashboardPreferences).mockImplementation(async (userId: number) => ({ telegramUserId: userId, ...byUser[userId] }) as never);
}

describe('CoachDashboardService games cache', () => {
  beforeEach(() => {
    vi.mocked(getGamesByDate).mockReset().mockResolvedValue([]);
  });

  test('should share per-league and per-team lists between users with overlapping selections', async () => {
    mockPreferences({
      1: { competitionIds: [7, 11], favoriteTeams: [{ id: 131, name: 'Barcelona' }] },
      2: { competitionIds: [11, 7, 572], favoriteTeams: [{ id: 131, name: 'Barcelona' }] },
    });
    const service = new CoachDashboardService();

    await service.getDashboard(1, 'en', undefined, NOW);
    await service.getDashboard(2, 'en', undefined, NOW);

    const calls = vi.mocked(getGamesByDate).mock.calls.map(([options]) => ({ competitionIds: options.competitionIds, competitorIds: options.competitorIds }));
    expect(calls).toEqual([
      { competitionIds: [7], competitorIds: undefined },
      { competitionIds: [11], competitorIds: undefined },
      { competitionIds: undefined, competitorIds: [131] },
      { competitionIds: [572], competitorIds: undefined },
    ]);
  });
});

function makeGame(id: number, startTime: string, statusGroup: number): ScoresGame {
  return {
    id,
    competitionId: 7,
    competitionDisplayName: 'Premier League',
    startTime,
    statusGroup,
    homeCompetitor: { id: id * 10, name: `Home ${id}`, score: 1 },
    awayCompetitor: { id: id * 10 + 1, name: `Away ${id}`, score: 0 },
  } as ScoresGame;
}

// Late kick-off on the 17th still running after midnight, a finished game on the 17th and a scheduled one on the 18th (Asia/Jerusalem).
const LATE_LIVE = makeGame(1, '2026-10-17T22:30:00+03:00', 3);
const EARLIER_FINISHED = makeGame(2, '2026-10-17T19:00:00+03:00', 4);
const TOMORROW_SCHEDULED = makeGame(3, '2026-10-18T20:00:00+03:00', 2);
const TODAY_LIVE = makeGame(4, '2026-10-18T00:30:00+03:00', 3);

function mockGamesByDay(byDay: Record<string, ScoresGame[]>) {
  vi.mocked(getGamesByDate).mockImplementation(async ({ date }) => byDay[format(date, 'yyyy-MM-dd')] ?? []);
}

describe('CoachDashboardService day selection', () => {
  beforeEach(() => {
    vi.mocked(getGamesByDate).mockReset();
    mockPreferences({ 1: { competitionIds: [7] } });
  });

  test.each([
    { name: 'evening shows today', now: '2026-10-17T20:00:00+03:00', requested: undefined, byDay: { '2026-10-17': [EARLIER_FINISHED] }, date: '2026-10-17', today: '2026-10-17', ids: [2] },
    {
      name: 'after midnight opens on last night with its live game',
      now: '2026-10-18T00:20:00+03:00',
      requested: undefined,
      byDay: { '2026-10-17': [EARLIER_FINISHED, LATE_LIVE], '2026-10-18': [TOMORROW_SCHEDULED] },
      date: '2026-10-17',
      today: '2026-10-18',
      ids: [1, 2],
    },
    {
      name: 'after midnight falls back to today when last night had no games',
      now: '2026-10-18T00:20:00+03:00',
      requested: undefined,
      byDay: { '2026-10-18': [TOMORROW_SCHEDULED] },
      date: '2026-10-18',
      today: '2026-10-18',
      ids: [3],
    },
    {
      name: 'today after midnight keeps the game still live from last night',
      now: '2026-10-18T00:20:00+03:00',
      requested: '2026-10-18',
      byDay: { '2026-10-17': [EARLIER_FINISHED, LATE_LIVE], '2026-10-18': [TOMORROW_SCHEDULED] },
      date: '2026-10-18',
      today: '2026-10-18',
      ids: [1, 3],
    },
    {
      name: 'last night after midnight shows a live game that kicked off after midnight',
      now: '2026-10-18T01:00:00+03:00',
      requested: undefined,
      byDay: { '2026-10-17': [EARLIER_FINISHED], '2026-10-18': [TODAY_LIVE, TOMORROW_SCHEDULED] },
      date: '2026-10-17',
      today: '2026-10-18',
      ids: [4, 2],
    },
    {
      name: 'from the rollover hour on opens on today',
      now: '2026-10-18T06:00:00+03:00',
      requested: undefined,
      byDay: { '2026-10-17': [EARLIER_FINISHED], '2026-10-18': [TOMORROW_SCHEDULED] },
      date: '2026-10-18',
      today: '2026-10-18',
      ids: [3],
    },
    {
      name: 'a requested past day',
      now: '2026-10-18T12:00:00+03:00',
      requested: '2026-10-17',
      byDay: { '2026-10-17': [EARLIER_FINISHED], '2026-10-18': [TODAY_LIVE] },
      date: '2026-10-17',
      today: '2026-10-18',
      ids: [2],
    },
  ])('$name', async ({ now, requested, byDay, date, today, ids }) => {
    mockGamesByDay(byDay);
    const result = await new CoachDashboardService().getDashboard(1, 'en', requested, new Date(now));
    expect({ date: result.date, today: result.today, ids: result.games.map((g) => g.id) }).toEqual({ date, today, ids });
  });
});
