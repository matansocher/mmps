import type { ScoresGame, ScoresGameDetails, ScoresGameStat } from '@services/scores-365';
import { parsePreferencesBody } from './dto';
import { classifyGameStatus, mapEventType, sortDashboardGames, toDashboardEvents, toDashboardGame, toDashboardStats, toGameSummary } from './transformers';
import type { DashboardGame } from './types';

const baseGame: ScoresGame = {
  id: 100,
  competitionId: 7,
  competitionDisplayName: 'Premier League',
  startTime: '2026-10-17T17:00:00+03:00',
  statusGroup: 3,
  shortStatusText: '2nd Half',
  gameTime: 67,
  gameTimeDisplay: "67'",
  homeCompetitor: { id: 110, name: 'Man City', score: 2 },
  awayCompetitor: { id: 9, name: 'Ipswich', score: 1 },
};

const details: ScoresGameDetails = {
  ...baseGame,
  tvNetworks: [
    { id: 1, name: 'Sport 1' },
    { id: 2, name: 'Sport 1' },
    { id: 3, name: 'Sport 2' },
  ],
  members: [
    { id: 1, name: 'Phil Foden', shortName: 'Foden' },
    { id: 2, name: 'Erling Haaland' },
    { id: 3, name: 'Kevin De Bruyne', shortName: 'De Bruyne' },
  ],
  events: [
    { competitorId: 110, order: 1, gameTime: 19, gameTimeDisplay: "19'", playerId: 1, extraPlayers: [3], eventType: { id: 1, name: 'Goal', subTypeId: 1, subTypeName: 'Field Goal' } },
    { competitorId: 9, order: 2, gameTime: 30, gameTimeDisplay: "30'", eventType: { id: 2, name: 'Yellow Card' } },
    { competitorId: 9, order: 3, gameTime: 50, gameTimeDisplay: "50'", eventType: { id: 11, name: 'Goal Disallowed', subTypeId: 25, subTypeName: 'Var' } },
    { competitorId: 110, order: 4, gameTime: 60, gameTimeDisplay: "60'", playerId: 2, eventType: { id: 999, name: 'unknown' } },
  ],
};

const stats: ScoresGameStat[] = [
  { id: 10, name: 'Possession', competitorId: 110, value: '70%' },
  { id: 10, name: 'Possession', competitorId: 9, value: '30%' },
  { id: 76, name: 'xG', competitorId: 110, value: '1.27' },
  { id: 4, name: 'On target', competitorId: 9, value: '2' },
];

function makeGame(overrides: Partial<DashboardGame>): DashboardGame {
  return {
    id: 1,
    competitionId: 7,
    competitionName: 'PL',
    startTime: '2026-10-17T17:00:00+03:00',
    status: 'live',
    statusText: '',
    home: { id: 1, name: 'A', score: 0 },
    away: { id: 2, name: 'B', score: 0 },
    isFavorite: false,
    lineupsConfirmed: false,
    channels: [],
    events: [],
    ...overrides,
  };
}

describe('classifyGameStatus()', () => {
  test.each([
    { statusGroup: 2, expected: 'scheduled' },
    { statusGroup: 3, expected: 'live' },
    { statusGroup: 4, expected: 'finished' },
    { statusGroup: 5, expected: 'other' },
  ])('should return $expected for statusGroup $statusGroup', ({ statusGroup, expected }) => {
    expect(classifyGameStatus(statusGroup)).toEqual(expected);
  });
});

describe('mapEventType()', () => {
  test.each([
    { id: 1, name: 'Goal', expected: 'goal' },
    { id: 2, name: 'Yellow Card', expected: 'yellowCard' },
    { id: 3, name: 'Red Card', expected: 'redCard' },
    { id: 6, name: 'Missed Penalty', expected: 'missedPenalty' },
    { id: 11, name: 'Goal Disallowed', expected: 'var' },
    { id: 12, name: 'Woodwork', expected: 'woodwork' },
    { id: 1000, name: 'Substitution', expected: 'substitution' },
    { id: 77, name: 'Second Yellow Red Card', expected: 'redCard' },
    { id: 78, name: 'something', expected: null },
  ])('should map event $id ($name) to $expected', ({ id, name, expected }) => {
    expect(mapEventType({ competitorId: 1, gameTime: 1, eventType: { id, name } })).toEqual(expected);
  });
});

describe('toDashboardEvents()', () => {
  it('should map players, assists, sides and drop unknown events', () => {
    const events = toDashboardEvents(details, 'en');
    expect(events.map((e) => e.type)).toEqual(['goal', 'yellowCard', 'var']);
    expect(events[0]).toEqual({ key: '100:1:1', gameId: 100, type: 'goal', minute: 19, minuteDisplay: "19'", side: 'home', playerName: 'Foden', assistName: 'De Bruyne' });
    expect(events[1].side).toEqual('away');
    expect(events[2].detail).toEqual('Goal Disallowed');
  });

  it('should return an empty list without details', () => {
    expect(toDashboardEvents(null, 'en')).toEqual([]);
  });

  test.each([
    { lang: 'en' as const, expected: 'Own goal' },
    { lang: 'he' as const, expected: 'שער עצמי' },
  ])('should flag own goals with a $lang label', ({ lang, expected }) => {
    const ownGoal = {
      ...details,
      events: [{ competitorId: 110, order: 1, gameTime: 5, gameTimeDisplay: "5'", playerId: 1, eventType: { id: 1, name: 'Goal', subTypeId: 2, subTypeName: 'Own Goal' } }],
    };
    expect(toDashboardEvents(ownGoal, lang)[0]).toMatchObject({ ownGoal: true, detail: expected });
  });
});

describe('toDashboardStats()', () => {
  it('should pair home and away values', () => {
    expect(toDashboardStats(stats, 110, 9)).toEqual({ possession: ['70%', '30%'], expectedGoals: ['1.27', '0'], shotsOnTarget: ['0', '2'] });
  });

  it('should return undefined when no stats are available', () => {
    expect(toDashboardStats([], 110, 9)).toEqual(undefined);
  });
});

describe('toDashboardGame()', () => {
  it('should build a live game with stats and favorite flag', () => {
    const game = toDashboardGame({ game: baseGame, details, stats, favoriteTeamIds: new Set([9]), lang: 'en' });
    expect(game.status).toEqual('live');
    expect(game.minuteDisplay).toEqual("67'");
    expect(game.minute).toEqual(67);
    expect(game.competitionName).toEqual('Premier League');
    expect(game.channels).toEqual([
      { id: 1, name: 'Sport 1' },
      { id: 3, name: 'Sport 2' },
    ]);
    expect(game.home.score).toEqual(2);
    expect(game.isFavorite).toEqual(true);
    expect(game.stats?.possession).toEqual(['70%', '30%']);
  });

  it('should hide scores and stats for scheduled games', () => {
    const scheduled = { ...baseGame, statusGroup: 2, homeCompetitor: { id: 1, name: 'A', score: -1 }, awayCompetitor: { id: 2, name: 'B', score: -1 } };
    const game = toDashboardGame({ game: scheduled, details: null, stats, favoriteTeamIds: new Set(), lang: 'en' });
    expect(game.home.score).toEqual(null);
    expect(game.stats).toEqual(undefined);
    expect(game.minuteDisplay).toEqual(undefined);
  });
});

describe('sortDashboardGames()', () => {
  it('should pin favorites, then order live, scheduled, finished', () => {
    const games = [makeGame({ id: 1, status: 'finished' }), makeGame({ id: 2, status: 'scheduled' }), makeGame({ id: 3, status: 'live' }), makeGame({ id: 4, status: 'finished', isFavorite: true })];
    expect(sortDashboardGames(games).map((g) => g.id)).toEqual([4, 3, 2, 1]);
  });

  it('should show the most recently started finished games first', () => {
    const games = [makeGame({ id: 1, status: 'finished', startTime: '2026-10-17T13:00:00Z' }), makeGame({ id: 2, status: 'finished', startTime: '2026-10-17T15:00:00Z' })];
    expect(sortDashboardGames(games).map((g) => g.id)).toEqual([2, 1]);
  });
});

describe('toGameSummary()', () => {
  test.each([
    { home: 2, away: 1, teamId: 110, expected: 'W' },
    { home: 2, away: 1, teamId: 9, expected: 'L' },
    { home: 1, away: 1, teamId: 9, expected: 'D' },
  ])('should mark a $home-$away finished game as $expected for team $teamId', ({ home, away, teamId, expected }) => {
    const game = { ...baseGame, statusGroup: 4, homeCompetitor: { id: 110, name: 'A', score: home }, awayCompetitor: { id: 9, name: 'B', score: away } };
    expect(toGameSummary(game, 'en', teamId).result).toEqual(expected);
  });

  it('should not set a result for live games', () => {
    expect(toGameSummary(baseGame, 'en', 110).result).toEqual(undefined);
  });
});

describe('parsePreferencesBody()', () => {
  it('should keep only valid values', () => {
    const parsed = parsePreferencesBody({
      competitionIds: [7, 7, 999999, 'x'],
      favoriteTeams: [{ id: 110, name: ' Man City ' }, { id: -1, name: 'bad' }, { id: 5 }],
      eventTypes: ['goal', 'nope', 'goal', 'var'],
    });
    expect(parsed).toEqual({ competitionIds: [7], favoriteTeams: [{ id: 110, name: 'Man City' }], eventTypes: ['goal', 'var'] });
  });

  test.each([{ body: null }, { body: {} }, { body: { competitionIds: [], favoriteTeams: [] } }])('should reject invalid body $body', ({ body }) => {
    expect(parsePreferencesBody(body)).toEqual(null);
  });
});
