import type { ScoresAthleteDetails, ScoresBracket, ScoresGame, ScoresGameDetails, ScoresHeadToHead, ScoresNews, ScoresStandings } from '@services/scores-365';
import { toDashboardForm, toDashboardStandings, toGameDetail, toGameStatRows, toHeadToHead, toKnockoutStages, toMatchdays, toPlayerDetail, toStandingsTables, toNews } from './detail-transformers';
import { toDashboardGame } from './transformers';

const details: ScoresGameDetails = {
  id: 1,
  competitionId: 7,
  startTime: '2026-10-17T17:00:00Z',
  statusGroup: 4,
  roundName: 'Round',
  roundNum: 8,
  venue: { name: 'Etihad Stadium' },
  officials: [{ name: 'Michael Oliver' }],
  hasStandings: true,
  stages: [{ id: 7, name: 'Halftime', homeCompetitorScore: 1, awayCompetitorScore: 0, isEnded: true }],
  members: [
    { id: 10, athleteId: 100, name: 'Starter One', shortName: 'One', jerseyNumber: 9 },
    { id: 11, athleteId: 101, name: 'Sub One', jerseyNumber: 20 },
    { id: 12, athleteId: 102, name: 'Unused Sub' },
    { id: 13, name: 'The Coach' },
    { id: 14, athleteId: 104, name: 'Injured Guy' },
    { id: 20, athleteId: 200, name: 'Away Starter' },
  ],
  events: [{ competitorId: 110, gameTime: 60, playerId: 11, extraPlayers: [10], eventType: { id: 1000, name: 'Substitution' } }],
  homeCompetitor: {
    id: 110,
    name: 'Man City',
    score: 2,
    lineups: {
      status: 'Confirmed',
      formation: '4-3-3',
      members: [
        {
          id: 10,
          status: 1,
          position: { id: 4, name: 'Attacker' },
          yardFormation: { fieldLine: 90, fieldSide: 50 },
          ranking: 7.4,
          stats: [
            { type: 1, name: 'Goals', value: '1', isTop: true },
            { type: 2, name: 'Touches', value: '40' },
          ],
        },
        { id: 12, status: 2 },
        { id: 11, status: 2 },
        { id: 13, status: 4, statusText: 'Management' },
        { id: 14, status: 3, statusText: 'Missing' },
      ],
    },
  },
  awayCompetitor: { id: 9, name: 'Ipswich', score: 1, lineups: { members: [{ id: 20, status: 1 }] } },
};

describe('toGameStatRows()', () => {
  it('should pair home and away values ordered by order', () => {
    const rows = toGameStatRows(
      [
        { id: 4, name: 'On target', competitorId: 110, value: '5', order: 2 },
        { id: 10, name: 'Possession', competitorId: 9, value: '40%', order: 1, isMajor: true },
        { id: 10, name: 'Possession', competitorId: 110, value: '60%', order: 1, isMajor: true },
      ],
      110,
      9,
    );
    expect(rows).toEqual([
      { id: 10, name: 'Possession', home: '60%', away: '40%', isMajor: true },
      { id: 4, name: 'On target', home: '5', away: '-', isMajor: false },
    ]);
  });
});

describe('toGameDetail()', () => {
  const game = toDashboardGame({ game: details, details, stats: [], favoriteTeamIds: new Set(), lang: 'en' });
  const detail = toGameDetail(game, details, []);

  it('should include match info and halftime score', () => {
    expect(detail.venue).toEqual('Etihad Stadium');
    expect(detail.referee).toEqual('Michael Oliver');
    expect(detail.round).toEqual('Round 8');
    expect(detail.halftimeScore).toEqual([1, 0]);
  });

  it('should split the lineup into starting, bench, missing and coach with sub times', () => {
    const home = detail.lineups?.home;
    expect(home?.coach).toEqual('The Coach');
    expect(home?.starting).toEqual([
      {
        athleteId: 100,
        name: 'Starter One',
        shortName: 'One',
        jerseyNumber: 9,
        position: 'Attacker',
        rating: 7.4,
        fieldLine: 90,
        fieldSide: 50,
        subbedOffAt: 60,
        stats: [{ name: 'Goals', value: '1' }],
      },
    ]);
    expect(home?.bench.map((p) => [p.name, p.subbedOnAt])).toEqual([
      ['Sub One', 60],
      ['Unused Sub', undefined],
    ]);
    expect(home?.missing.map((p) => p.name)).toEqual(['Injured Guy']);
  });
});

describe('toStandingsTables()', () => {
  const standings: ScoresStandings = {
    competitionId: 5930,
    groups: [
      { num: 1, name: 'Group A' },
      { num: 2, name: 'Group B' },
    ],
    destinations: [
      { num: 1, name: 'Next round', color: '#0f0' },
      { num: 2, name: 'Unused', color: '#f00' },
    ],
    rows: [
      { competitor: { id: 2, name: 'B' }, position: 1, groupNum: 2, points: 3, destinationNum: 1, recentForm: [1, 2, 0], liveGameId: 55, trend: -1 },
      { competitor: { id: 1, name: 'A' }, position: 1, groupNum: 1, points: 6, gamePlayed: 2, gamesWon: 2, for: 4, against: 1 },
    ],
  };

  it('should group rows, convert form oldest first and keep only used zones', () => {
    const { tables, zones } = toStandingsTables(standings);
    expect(tables.map((t) => t.name)).toEqual(['Group A', 'Group B']);
    expect(tables[0].rows[0]).toEqual({ position: 1, team: { id: 1, name: 'A' }, played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 1, points: 6, form: [], isLive: false, trend: 0 });
    expect(tables[1].rows[0].form).toEqual(['L', 'D', 'W']);
    expect(tables[1].rows[0].zoneColor).toEqual('#0f0');
    expect(tables[1].rows[0].isLive).toEqual(true);
    expect(tables[1].rows[0].liveGameId).toEqual(55);
    expect(tables[1].rows[0].trend).toEqual(-1);
    expect(zones).toEqual([{ name: 'Next round', color: '#0f0' }]);
  });

  it('should return empty tables without standings', () => {
    expect(toStandingsTables(null)).toEqual({ tables: [], zones: [] });
  });
});

describe('toKnockoutStages()', () => {
  it('should skip group stages and map matchups with legs', () => {
    const brackets: ScoresBracket[] = [
      {
        stages: [
          { num: 1, name: 'Groups', hasStandings: true, groups: [{ num: 1, participants: [{ competitorId: 1, name: 'A' }] }] },
          {
            num: 2,
            name: 'Final',
            groups: [
              {
                num: 1,
                score: [2, 1],
                participants: [
                  { competitorId: 1, name: 'A', isQualified: true },
                  { competitorId: 2, name: 'B' },
                ],
                games: [{ gameId: 9, game: { startTime: '2026-07-19T22:00:00Z', statusGroup: 4, homeCompetitor: { id: 1, score: 2 }, awayCompetitor: { id: 2, score: 1 } } }],
              },
            ],
          },
        ],
      },
    ];
    expect(toKnockoutStages(brackets)).toEqual([
      {
        name: 'Final',
        matchups: [
          {
            teams: [
              { id: 1, name: 'A', isQualified: true },
              { id: 2, name: 'B', isQualified: false },
            ],
            aggregate: [2, 1],
            legs: [{ gameId: 9, startTime: '2026-07-19T22:00:00Z', status: 'finished', homeId: 1, homeScore: 2, awayScore: 1 }],
          },
        ],
      },
    ]);
  });
});

describe('toPlayerDetail()', () => {
  it('should map season stats and known per-game stats', () => {
    const athlete: ScoresAthleteDetails = {
      id: 5,
      name: 'Keeper',
      jerseyNum: 1,
      highlightStats: [{ competitionId: 7, name: 'EPL', stats: [{ type: 1, name: 'Saves', value: '20' }] }],
      lastMatches: {
        games: [
          {
            game: { id: 1, competitionId: 7, startTime: '2026-10-17T17:00:00Z', statusGroup: 4, homeCompetitor: { id: 110, name: 'A', score: 0 }, awayCompetitor: { id: 9, name: 'B', score: 1 } },
            relatedCompetitor: 110,
            athleteStats: [{ type: 229, value: '90' }, {}, { type: 0, value: '6.1' }],
          },
        ],
      },
    };
    const player = toPlayerDetail(athlete, 'en');
    expect(player.seasonStats).toEqual([{ competitionName: 'Premier League', stats: [{ name: 'Saves', value: '20' }] }]);
    expect(player.recentGames[0].result).toEqual('L');
    expect(player.recentGames[0].stats).toEqual([
      { name: 'Minutes', value: '90' },
      { name: 'Rating', value: '6.1' },
    ]);
  });
});

describe('toHeadToHead()', () => {
  const game = (id: number, homeId: number, awayId: number, homeScore: number, awayScore: number, statusGroup = 4): ScoresGame => ({
    id,
    competitionId: 7,
    startTime: '2026-01-01T17:00:00Z',
    statusGroup,
    homeCompetitor: { id: homeId, name: `T${homeId}`, score: homeScore },
    awayCompetitor: { id: awayId, name: `T${awayId}`, score: awayScore },
  });

  it('should count the record from the home team perspective and skip the current and unfinished games', () => {
    const h2h: ScoresHeadToHead = {
      id: 99,
      homeCompetitor: { id: 1, name: 'T1', recentGames: [game(99, 1, 2, 0, 0, 2), game(10, 1, 3, 2, 0), game(11, 4, 1, 1, 1)] },
      awayCompetitor: { id: 2, name: 'T2', recentGames: [game(12, 2, 5, 0, 1)] },
      h2hGames: [game(99, 1, 2, 0, 0, 2), game(20, 1, 2, 2, 1), game(21, 2, 1, 3, 0), game(22, 2, 1, 1, 1), game(23, 2, 1, 0, 2)],
    };
    const result = toHeadToHead(h2h, 'en');
    expect(result.record).toEqual({ homeWins: 2, draws: 1, awayWins: 1 });
    expect(result.meetings.map((m) => m.id)).toEqual([20, 21, 22, 23]);
    expect(result.homeRecent.map((g) => g.result)).toEqual(['W', 'D']);
    expect(result.awayRecent.map((g) => g.result)).toEqual(['L']);
  });

  it('should build form oldest first from each team perspective', () => {
    const h2h: ScoresHeadToHead = {
      id: 99,
      homeCompetitor: { id: 1, name: 'T1', recentGames: [game(10, 1, 3, 2, 0), game(11, 4, 1, 1, 1)] },
      awayCompetitor: { id: 2, name: 'T2', recentGames: [game(12, 5, 2, 3, 1)] },
    };
    expect(toDashboardForm(toHeadToHead(h2h, 'en'), 1, 2)).toEqual({
      home: [
        { result: 'D', opponent: 'T4', score: '1-1' },
        { result: 'W', opponent: 'T3', score: '2-0' },
      ],
      away: [{ result: 'L', opponent: 'T5', score: '1-3' }],
    });
    expect(toDashboardForm(null, 1, 2)).toBeUndefined();
  });

  it('should return undefined without data', () => {
    expect(toHeadToHead(null, 'en')).toBeUndefined();
    expect(toHeadToHead({ id: 1, homeCompetitor: { id: 1, name: 'A' }, awayCompetitor: { id: 2, name: 'B' } }, 'en')).toBeUndefined();
  });
});

describe('toMatchdays()', () => {
  const game = (id: number, roundNum: number, statusGroup: number, day: number, stageNum = 1): ScoresGame => ({
    id,
    competitionId: 7,
    startTime: `2026-10-${String(day).padStart(2, '0')}T15:00:00Z`,
    statusGroup,
    roundNum,
    stageNum,
    seasonNum: 132,
    homeCompetitor: { id: id * 10, name: `H${id}`, score: statusGroup === 2 ? -1 : 1 },
    awayCompetitor: { id: id * 10 + 1, name: `A${id}`, score: statusGroup === 2 ? -1 : 0 },
  });
  const summarize = (matchdays: ReturnType<typeof toMatchdays>) => matchdays.map((m) => ({ roundNum: m.roundNum, kind: m.kind, ids: m.games.map((g) => g.id) }));

  it('should return the previous, in-progress and next rounds merged from results and fixtures', () => {
    const results = [game(4, 7, 4, 10), game(3, 7, 4, 9), game(2, 6, 4, 3), game(1, 6, 4, 2)];
    const fixtures = [game(5, 7, 2, 11), game(6, 8, 2, 17), game(7, 9, 2, 24)];
    expect(summarize(toMatchdays(results, fixtures, 'en'))).toEqual([
      { roundNum: 6, kind: 'previous', ids: [1, 2] },
      { roundNum: 7, kind: 'current', ids: [3, 4, 5] },
      { roundNum: 8, kind: 'next', ids: [6] },
    ]);
  });

  it('should return the last played round and the next one when no round is in progress', () => {
    const results = [game(2, 6, 4, 3), game(1, 5, 4, 1)];
    const fixtures = [game(3, 7, 2, 10), game(4, 8, 2, 17)];
    expect(summarize(toMatchdays(results, fixtures, 'en'))).toEqual([
      { roundNum: 6, kind: 'previous', ids: [2] },
      { roundNum: 7, kind: 'next', ids: [3] },
    ]);
  });

  it('should treat a round with a live game as current', () => {
    expect(summarize(toMatchdays([game(1, 3, 4, 1)], [game(2, 3, 3, 2), game(3, 4, 2, 9)], 'en'))).toEqual([
      { roundNum: 3, kind: 'current', ids: [1, 2] },
      { roundNum: 4, kind: 'next', ids: [3] },
    ]);
  });

  it('should only use the stage currently being played and skip games without a round', () => {
    const results = [game(1, 6, 4, 1, 1), game(2, 1, 4, 5, 2), { ...game(3, 1, 4, 6, 2), roundNum: undefined }];
    expect(summarize(toMatchdays(results, [game(4, 2, 2, 9, 2)], 'en'))).toEqual([
      { roundNum: 1, kind: 'previous', ids: [2] },
      { roundNum: 2, kind: 'next', ids: [4] },
    ]);
  });

  it('should return only the first round before the season starts and nothing without rounds', () => {
    expect(summarize(toMatchdays([], [game(2, 2, 2, 9), game(1, 1, 2, 2)], 'en'))).toEqual([{ roundNum: 1, kind: 'next', ids: [1] }]);
    expect(toMatchdays([], [], 'en')).toEqual([]);
  });
});

describe('toDashboardStandings()', () => {
  const row = (id: number, position: number, groupNum = 0) => ({
    competitor: { id, name: `T${id}` },
    position,
    groupNum,
    gamePlayed: 7,
    for: 10,
    against: 4,
    points: 15,
    destinationNum: position === 1 ? 1 : undefined,
  });
  const standings: ScoresStandings = { competitionId: 7, rows: [row(1, 1), row(2, 2), row(3, 1, 1)], destinations: [{ num: 1, name: 'UCL', color: '#00f' }] };

  it('should return both rows from the shared table', () => {
    expect(toDashboardStandings(standings, 2, 1)).toEqual({
      home: { position: 2, played: 7, points: 15, goalDiff: 6 },
      away: { position: 1, played: 7, points: 15, goalDiff: 6, zoneColor: '#00f' },
    });
  });

  it('should return undefined when the teams are in different tables or missing', () => {
    expect(toDashboardStandings(standings, 1, 3)).toBeUndefined();
    expect(toDashboardStandings(standings, 1, 99)).toBeUndefined();
    expect(toDashboardStandings(null, 1, 2)).toBeUndefined();
  });
});

describe('toNews()', () => {
  test('should return newest first with source names and drop items without a valid link', () => {
    const news: ScoresNews = {
      news: [
        { id: 1, title: 'Older', url: 'https://a.com/1', publishDate: '2026-10-20T10:00:00+03:00', sourceId: 11 },
        { id: 2, title: 'Newer', url: 'https://b.com/2', image: 'https://b.com/2.jpg', publishDate: '2026-10-21T10:00:00+03:00', sourceId: 99 },
        { id: 3, title: 'Bad link', url: 'javascript:alert(1)', publishDate: '2026-10-21T11:00:00+03:00' },
      ],
      sources: [{ id: 11, name: 'BBC' }],
    };
    expect(toNews(news)).toEqual([
      { id: 2, title: 'Newer', url: 'https://b.com/2', image: 'https://b.com/2.jpg', publishedAt: '2026-10-21T10:00:00+03:00' },
      { id: 1, title: 'Older', url: 'https://a.com/1', source: 'BBC', publishedAt: '2026-10-20T10:00:00+03:00' },
    ]);
  });

  test('should return an empty list when news failed to load', () => {
    expect(toNews(undefined)).toEqual([]);
  });
});
