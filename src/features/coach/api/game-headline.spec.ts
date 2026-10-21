import type { ScoresGame, ScoresStandings, ScoresStandingsRow } from '@services/scores-365';
import { getGameHeadline } from './game-headline';

const GAME_ID = 99;

// [id, points, goalsFor, goalsAgainst, played, destinationNum]
type RowSpec = readonly [number, number, number, number, number, number?];

function standings(rows: readonly RowSpec[], playedIds: readonly number[] = [1, 2]): ScoresStandings {
  return {
    competitionId: 7,
    destinations: [
      { num: 1, name: 'Champions League', type: 8 },
      { num: 2, name: 'Relegation ', type: 3 },
    ],
    rows: rows.map(([id, points, goalsFor, against, gamePlayed, destinationNum], index): ScoresStandingsRow => ({
      competitor: { id, name: `T${id}` },
      position: index + 1,
      points,
      for: goalsFor,
      against,
      gamePlayed,
      destinationNum,
      detailedRecentForm: playedIds.includes(id) ? [{ id: GAME_ID }] : [{ id: 1 }],
    })),
  };
}

function game(homeScore: number, awayScore: number, extra: Partial<ScoresGame['homeCompetitor']> = {}): Pick<ScoresGame, 'id' | 'homeCompetitor' | 'awayCompetitor'> {
  return { id: GAME_ID, homeCompetitor: { id: 1, name: 'Home', score: homeScore, ...extra }, awayCompetitor: { id: 2, name: 'Away', score: awayScore } };
}

describe('getGameHeadline()', () => {
  test('should report a team going top', () => {
    const table = standings([
      [1, 13, 10, 5, 5, 1],
      [3, 12, 9, 5, 5, 1],
      [4, 9, 6, 6, 5],
      [2, 3, 3, 9, 5, 2],
    ]);
    expect(getGameHeadline(game(2, 0), table)).toEqual({ type: 'top', teamId: 1 });
  });

  test('should report entering a qualification zone', () => {
    const table = standings([
      [3, 15, 10, 5, 5, 1],
      [1, 10, 8, 6, 5, 1],
      [4, 9, 6, 6, 5],
      [2, 3, 3, 9, 5, 2],
    ]);
    expect(getGameHeadline(game(1, 0), table)).toEqual({ type: 'zoneIn', teamId: 1, zone: 'Champions League' });
  });

  test('should report a drop into the relegation zone over the winner climbing out of it', () => {
    const table = standings([
      [3, 15, 10, 5, 5, 1],
      [1, 12, 8, 6, 5],
      [4, 10, 6, 6, 5],
      [2, 9, 9, 8, 5, 2],
    ]);
    expect(getGameHeadline(game(1, 0), table)).toEqual({ type: 'dangerIn', teamId: 2, zone: 'Relegation' });
  });

  test('should report a big climb', () => {
    const table = standings([
      [3, 13, 9, 5, 5],
      [1, 12, 9, 5, 5],
      [4, 11, 6, 6, 5],
      [5, 10, 6, 6, 5],
      [2, 3, 3, 9, 5],
    ]);
    expect(getGameHeadline(game(1, 0), { ...table, destinations: [] })).toEqual({ type: 'moveUp', teamId: 1, position: 2 });
  });

  test('should report a mathematical title', () => {
    const table = standings([
      [1, 90, 80, 20, 36, 1],
      [3, 83, 60, 30, 36, 1],
      [4, 70, 50, 40, 37],
      [2, 20, 20, 70, 37, 2],
    ]);
    expect(getGameHeadline(game(3, 0), table, 38)).toEqual({ type: 'champions', teamId: 1 });
  });

  test('should report a knockout team going through', () => {
    expect(getGameHeadline(game(1, 1, { isQualified: true }), null)).toEqual({ type: 'qualified', teamId: 1 });
  });

  test('should skip when the table does not include the game yet', () => {
    const table = standings(
      [
        [1, 13, 10, 5, 5, 1],
        [3, 12, 9, 5, 5, 1],
        [2, 3, 3, 9, 5, 2],
      ],
      [],
    );
    expect(getGameHeadline(game(2, 0), table)).toBeUndefined();
  });

  test('should return nothing when positions did not change', () => {
    const table = standings([
      [1, 20, 15, 5, 5, 1],
      [3, 12, 9, 5, 5, 1],
      [2, 3, 3, 9, 5, 2],
    ]);
    expect(getGameHeadline(game(2, 0), table)).toBeUndefined();
  });
});
