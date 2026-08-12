import axios from 'axios';
import { getUpcomingMatches } from './get-upcoming-matches';

vi.mock('axios');

function createFixture(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    competitionId: 596,
    competitionDisplayName: 'UEFA Europa League Qualifiers - 3rd Round',
    startTime: '2026-08-13T20:00:00+03:00',
    statusGroup: 2,
    stageName: '3rd Round',
    venue: { name: 'Stadium' },
    homeCompetitor: { id: 100, name: 'Home' },
    awayCompetitor: { id: 200, name: 'Away' },
    ...overrides,
  };
}

describe('getUpcomingMatches()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should preserve child competition identity, filter the date range, and deduplicate fixtures', async () => {
    vi.mocked(axios.get).mockImplementation(async (url) => {
      const competitionId = Number(new URL(url).searchParams.get('competitions'));
      if (competitionId === 573 || competitionId === 7685) {
        return {
          data: {
            games: [
              createFixture(1),
              createFixture(2, { startTime: '2026-08-20T20:00:00+03:00', homeCompetitor: { id: 100, name: 'Home' }, awayCompetitor: { id: 300, name: 'Future' } }),
              createFixture(3, { statusGroup: 3 }),
            ],
          },
        };
      }
      if (competitionId === 42) {
        return {
          data: {
            games: [
              createFixture(10, {
                competitionId: 42,
                competitionDisplayName: 'Premier League',
                startTime: '2026-08-13T21:00:00+03:00',
                homeCompetitor: { id: 100, name: 'Home' },
                awayCompetitor: { id: 400, name: 'League Opponent' },
              }),
            ],
          },
        };
      }
      return { data: { games: [] } };
    });

    const matches = await getUpcomingMatches('2026-08-12', '2026-08-15');

    expect(matches).toEqual([
      expect.objectContaining({
        id: 1,
        sourceCompetitionId: 573,
        competitionId: 596,
        competitionName: 'UEFA Europa League Qualifiers - 3rd Round',
        remainingHomeMatches: 1,
        remainingAwayMatches: 0,
      }),
      expect.objectContaining({
        id: 10,
        sourceCompetitionId: 42,
        competitionId: 42,
        remainingHomeMatches: 1,
        remainingAwayMatches: 1,
      }),
    ]);
  });

  it('should fail when a competition response is incomplete', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: {} });

    await expect(getUpcomingMatches('2026-08-12', '2026-08-15')).rejects.toThrow('Invalid fixtures response');
  });
});
