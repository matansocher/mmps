import type { ScoresAthleteDetails, ScoresBracket, ScoresGame, ScoresGameDetails, ScoresHeadToHead, ScoresStandings } from '@services/scores-365';
import { toDashboardForm, toGameDetail, toGameStatRows, toHeadToHead, toKnockoutStages, toPlayerDetail, toStandingsTables } from './detail-transformers';
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
