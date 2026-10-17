import { getGamesByDate } from '@services/scores-365';
import { getDashboardPreferences } from '@shared/coach';
import { CoachDashboardService } from './dashboard.service';

vi.mock('@services/scores-365', async (importOriginal) => ({ ...(await importOriginal<object>()), getGamesByDate: vi.fn() }));
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

    await service.getDashboard(1, 'en', NOW);
    await service.getDashboard(2, 'en', NOW);

    const calls = vi.mocked(getGamesByDate).mock.calls.map(([options]) => ({ competitionIds: options.competitionIds, competitorIds: options.competitorIds }));
    expect(calls).toEqual([
      { competitionIds: [7], competitorIds: undefined },
      { competitionIds: [11], competitorIds: undefined },
      { competitionIds: undefined, competitorIds: [131] },
      { competitionIds: [572], competitorIds: undefined },
    ]);
  });
});
