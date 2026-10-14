import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Competition, CompetitionDetails } from '../interface';
import { getMatchesForCompetition } from './get-matches-for-competition';
import { getMatchesSummaryDetails } from './get-matches-summary-details';

vi.mock('./get-matches-for-competition', () => ({ getMatchesForCompetition: vi.fn() }));

const competitions = [{ id: 42 }, { id: 572 }, { id: 7 }] as Competition[];

describe('getMatchesSummaryDetails()', () => {
  beforeEach(() => {
    vi.mocked(getMatchesForCompetition).mockReset();
  });

  it('should skip a failing competition and return the rest', async () => {
    vi.mocked(getMatchesForCompetition).mockImplementation(async (competition) => {
      if (competition.id === 572) throw new Error('timeout of 30000ms exceeded');
      return { competition, matches: competition.id === 42 ? [{ id: 1 }] : [] } as CompetitionDetails;
    });

    const result = await getMatchesSummaryDetails(competitions, '2026-09-25');

    expect(result.map(({ competition }) => competition.id)).toEqual([42]);
  });

  it('should throw when every competition fails', async () => {
    vi.mocked(getMatchesForCompetition).mockRejectedValue(new Error('timeout of 30000ms exceeded'));

    await expect(getMatchesSummaryDetails(competitions, '2026-09-25')).rejects.toThrow('timeout');
  });
});
