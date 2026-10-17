import type { ScoresGame, ScoresGameDetails, ScoresGameStat } from '@services/scores-365';
import { parsePreferencesBody } from './dto';
import { buildFeed, classifyGameStatus, estimateEventTime, mapEventType, sortDashboardGames, toDashboardEvents, toDashboardGame, toDashboardStats } from './transformers';
import type { DashboardGame } from './types';

const baseGame: ScoresGame = {
  id: 100,
  competitionId: 7,
  competitionDisplayName: 'Premier League',
  startTime: '2026-10-17T17:00:00+03:00',
  statusGroup: 3,
  shortStatusText: "מח' 2",
  gameTimeDisplay: "67'",
  homeCompetitor: { id: 110, name: 'Man City', score: 2 },
  awayCompetitor: { id: 9, name: 'Ipswich', score: 1 },
};

const details: ScoresGameDetails = {
  ...baseGame,
  members: [
    { id: 1, name: 'Phil Foden', shortName: 'Foden' },
    { id: 2, name: 'Erling Haaland' },
    { id: 3, name: 'Kevin De Bruyne', shortName: 'De Bruyne' },
  ],
  events: [
    { competitorId: 110, order: 1, gameTime: 19, gameTimeDisplay: "19'", playerId: 1, extraPlayers: [3], eventType: { id: 1, name: 'גול', subTypeId: 1, subTypeName: 'שער שדה' } },
    { competitorId: 9, order: 2, gameTime: 30, gameTimeDisplay: "30'", eventType: { id: 2, name: 'כרטיס צהוב' } },
    { competitorId: 9, order: 3, gameTime: 50, gameTimeDisplay: "50'", eventType: { id: 11, name: 'השער נפסל', subTypeId: 25, subTypeName: 'Var' } },
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
    { id: 1, name: 'גול', expected: 'goal' },
    { id: 2, name: 'כרטיס צהוב', expected: 'yellowCard' },
    { id: 3, name: 'כרטיס אדום', expected: 'redCard' },
    { id: 6, name: 'החמצת פנדל', expected: 'missedPenalty' },
    { id: 11, name: 'השער נפסל', expected: 'var' },
    { id: 12, name: 'Woodwork', expected: 'woodwork' },
    { id: 1000, name: 'Substitution', expected: 'substitution' },
    { id: 77, name: 'כרטיס אדום שני', expected: 'redCard' },
    { id: 78, name: 'something', expected: null },
  ])('should map event $id ($name) to $expected', ({ id, name, expected }) => {
    expect(mapEventType({ competitorId: 1, gameTime: 1, eventType: { id, name } })).toEqual(expected);
  });
});

describe('toDashboardEvents()', () => {
  it('should map players, assists, sides and drop unknown events', () => {
    const events = toDashboardEvents(details);
    expect(events.map((e) => e.type)).toEqual(['goal', 'yellowCard', 'var']);
    expect(events[0]).toEqual({ key: '100:1:1', gameId: 100, type: 'goal', minute: 19, minuteDisplay: "19'", side: 'home', playerName: 'Foden', assistName: 'De Bruyne', detail: 'שער שדה' });
    expect(events[1].side).toEqual('away');
    expect(events[2].detail).toEqual('השער נפסל');
  });

  it('should return an empty list without details', () => {
    expect(toDashboardEvents(null)).toEqual([]);
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
  const competitionNames = new Map([[7, 'פרמייר ליג']]);

  it('should build a live game with stats and favorite flag', () => {
    const game = toDashboardGame({ game: baseGame, details, stats, favoriteTeamIds: new Set([9]), competitionNames });
    expect(game.status).toEqual('live');
    expect(game.minuteDisplay).toEqual("67'");
    expect(game.competitionName).toEqual('פרמייר ליג');
    expect(game.home.score).toEqual(2);
    expect(game.isFavorite).toEqual(true);
    expect(game.stats?.possession).toEqual(['70%', '30%']);
  });

  it('should hide scores and stats for scheduled games', () => {
    const scheduled = { ...baseGame, statusGroup: 2, homeCompetitor: { id: 1, name: 'A', score: -1 }, awayCompetitor: { id: 2, name: 'B', score: -1 } };
    const game = toDashboardGame({ game: scheduled, details: null, stats, favoriteTeamIds: new Set(), competitionNames });
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

describe('estimateEventTime()', () => {
  test.each([
    { minute: 10, expected: '2026-10-17T14:10:00.000Z' },
    { minute: 60, expected: '2026-10-17T15:15:00.000Z' },
    { minute: 100, expected: '2026-10-17T16:00:00.000Z' },
    { minute: 53, minuteDisplay: "45'", expected: '2026-10-17T14:53:00.000Z' },
    { minute: 53, minuteDisplay: "53'", expected: '2026-10-17T15:08:00.000Z' },
  ])('should estimate minute $minute ($minuteDisplay) as $expected', ({ minute, minuteDisplay, expected }) => {
    expect(estimateEventTime('2026-10-17T14:00:00Z', minute, minuteDisplay).toISOString()).toEqual(expected);
  });
});

describe('buildFeed()', () => {
  it('should merge events across games, newest first', () => {
    const early = makeGame({ id: 1, startTime: '2026-10-17T14:00:00Z', events: [{ key: 'a', gameId: 1, type: 'goal', minute: 80, minuteDisplay: "80'", side: 'home' }] });
    const late = makeGame({ id: 2, startTime: '2026-10-17T15:00:00Z', events: [{ key: 'b', gameId: 2, type: 'goal', minute: 10, minuteDisplay: "10'", side: 'away' }] });
    const feed = buildFeed([early, late]);
    expect(feed.map((f) => f.key)).toEqual(['a', 'b']);
    expect(feed[0].estimatedAt).toEqual('2026-10-17T15:35:00.000Z');
    expect(feed[1].home).toEqual(late.home);
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
