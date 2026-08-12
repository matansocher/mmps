import type { CompetitionTableRow, UpcomingMatch } from '@services/scores-365';
import { selectSportsCalendarMatches } from './select-sports-calendar-matches';

function createMatch(overrides: Partial<UpcomingMatch> = {}): UpcomingMatch {
  return {
    id: 1,
    sourceCompetitionId: 7,
    competitionId: 7,
    competitionName: 'Premier League',
    startTime: '2026-08-15T18:00:00+03:00',
    homeTeam: { id: 1, name: 'Home' },
    awayTeam: { id: 2, name: 'Away' },
    remainingHomeMatches: 10,
    remainingAwayMatches: 10,
    ...overrides,
  };
}

function createTable(teamIds: number[], points: number[]): CompetitionTableRow[] {
  return teamIds.map((id, index) => ({
    competitor: { id, name: `Team ${id}` },
    points: points[index],
    gamesPlayed: 30,
  }));
}

describe('selectSportsCalendarMatches()', () => {
  it('should select favorite teams, World Cup, and Champions League by provider ID', () => {
    const selected = selectSportsCalendarMatches([
      createMatch({ id: 1, homeTeam: { id: 131, name: 'Real Madrid' } }),
      createMatch({ id: 2, competitionId: 5930 }),
      createMatch({ id: 3, competitionId: 572 }),
      createMatch({ id: 4, competitionId: 332, competitionName: 'UEFA Champions League Qualifiers' }),
    ]);

    expect(selected.map(({ id, category }) => ({ id, category }))).toEqual([
      { id: 1, category: 'favorite-team' },
      { id: 2, category: 'world-cup' },
      { id: 3, category: 'champions-league' },
    ]);
  });

  it('should select Israeli derbies regardless of home team order', () => {
    const selected = selectSportsCalendarMatches([
      createMatch({ id: 1, competitionId: 42, homeTeam: { id: 566, name: 'Maccabi Tel Aviv' }, awayTeam: { id: 567, name: 'Hapoel Tel Aviv' } }),
      createMatch({ id: 2, competitionId: 42, homeTeam: { id: 575, name: 'Hapoel Haifa' }, awayTeam: { id: 562, name: 'Maccabi Haifa' } }),
    ]);

    expect(selected.map(({ category }) => category)).toEqual(['israeli-derby', 'favorite-team']);
  });

  it('should select a title decider only when both top teams are within three points and have at most five matches remaining', () => {
    const table = createTable([10, 20, 30, 40], [70, 68, 60, 55]);
    const selected = selectSportsCalendarMatches(
      [
        createMatch({
          id: 1,
          competitionId: 42,
          homeTeam: { id: 10, name: 'First' },
          awayTeam: { id: 20, name: 'Second' },
          remainingHomeMatches: 5,
          remainingAwayMatches: 5,
        }),
        createMatch({
          id: 2,
          competitionId: 42,
          homeTeam: { id: 30, name: 'Third' },
          awayTeam: { id: 40, name: 'Fourth' },
          remainingHomeMatches: 4,
          remainingAwayMatches: 4,
        }),
      ],
      table,
    );

    expect(selected.map(({ id, category }) => ({ id, category }))).toEqual([
      { id: 1, category: 'title-decider' },
      { id: 2, category: 'israeli-top-four' },
    ]);
  });

  it('should prefer the favorite-team category when multiple rules match', () => {
    const selected = selectSportsCalendarMatches(
      [
        createMatch({
          competitionId: 42,
          homeTeam: { id: 562, name: 'Maccabi Haifa' },
          awayTeam: { id: 30, name: 'Third' },
        }),
      ],
      createTable([562, 20, 30, 40], [70, 68, 60, 55]),
    );

    expect(selected[0].category).toEqual('favorite-team');
  });
});
