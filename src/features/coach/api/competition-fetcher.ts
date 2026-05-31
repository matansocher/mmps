import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '@services/scores-365';
import type { KnockoutLeg, KnockoutMatchup, KnockoutStage, StandingsTable, TableRow } from './dto';

const logger = new Logger('CoachCompetitionFetcher');

type RawStandingsGroup = { num: number; name: string };

type RawStandingsRow = {
  competitor: { id: number; name: string };
  groupNum?: number | null;
  position?: number;
  gamePlayed?: number;
  for?: number;
  against?: number;
  points: number;
};

type RawStandings = {
  groups?: RawStandingsGroup[] | null;
  rows: RawStandingsRow[];
};

type RawBracketParticipant = {
  competitorId: number;
  name: string;
  symbolicName?: string;
  isQualified?: boolean;
};

type RawBracketCompetitor = {
  id?: number;
  score?: number;
};

type RawBracketGameDetails = {
  id?: number;
  startTime?: string;
  statusText?: string;
  homeCompetitor?: RawBracketCompetitor;
  awayCompetitor?: RawBracketCompetitor;
};

type RawBracketGame = {
  gameId: number;
  num?: number;
  game?: RawBracketGameDetails;
};

type RawBracketGroup = {
  num: number;
  name?: string;
  participants: RawBracketParticipant[];
  games?: RawBracketGame[];
  score?: number[];
};

type RawBracketStage = {
  num: number;
  name: string;
  hasStandings: boolean;
  groups?: RawBracketGroup[];
};

type RawBracket = {
  num: number;
  name?: string;
  stages: RawBracketStage[];
};

function buildRow(row: RawStandingsRow, idx: number): TableRow {
  return {
    rank: row.position ?? idx + 1,
    team: { id: row.competitor.id, name: row.competitor.name },
    played: row.gamePlayed ?? 0,
    goalDifference: (row.for ?? 0) - (row.against ?? 0),
    points: row.points,
    zone: null,
  };
}

function buildTables(standings: RawStandings | undefined): StandingsTable[] {
  if (!standings?.rows?.length) return [];
  const groupNameByNum = new Map<number, string>();
  for (const g of standings.groups ?? []) groupNameByNum.set(g.num, g.name);

  const byGroup = new Map<number | null, RawStandingsRow[]>();
  for (const row of standings.rows) {
    const key = row.groupNum ?? null;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)!.push(row);
  }

  const groupKeys = Array.from(byGroup.keys());
  groupKeys.sort((a, b) => (a ?? -1) - (b ?? -1));

  return groupKeys.map((key) => {
    const rows = byGroup.get(key)!.map(buildRow);
    rows.sort((a, b) => a.rank - b.rank);
    const groupName = key != null ? groupNameByNum.get(key) : undefined;
    return groupName ? { groupName, rows } : { rows };
  });
}

function buildLeg(raw: RawBracketGame, idx: number): KnockoutLeg {
  const g = raw.game;
  return {
    gameId: raw.gameId,
    num: raw.num ?? idx + 1,
    ...(g?.homeCompetitor?.id != null ? { homeCompetitorId: g.homeCompetitor.id } : {}),
    ...(g?.awayCompetitor?.id != null ? { awayCompetitorId: g.awayCompetitor.id } : {}),
    ...(typeof g?.homeCompetitor?.score === 'number' ? { homeScore: g.homeCompetitor.score } : {}),
    ...(typeof g?.awayCompetitor?.score === 'number' ? { awayScore: g.awayCompetitor.score } : {}),
    ...(g?.statusText ? { statusText: g.statusText } : {}),
    ...(g?.startTime ? { startTime: g.startTime } : {}),
  };
}

function buildMatchup(group: RawBracketGroup): KnockoutMatchup {
  const participants = (group.participants ?? []).map((p) => ({
    id: p.competitorId,
    name: p.name,
    ...(p.symbolicName ? { symbolicName: p.symbolicName } : {}),
    ...(typeof p.isQualified === 'boolean' ? { isQualified: p.isQualified } : {}),
  }));
  const games = group.games ?? [];
  const legs = games.filter((g) => g.gameId).map((g, i) => buildLeg(g, i));
  const lastGame = games[games.length - 1];
  return {
    participants,
    ...(group.score && group.score.length ? { score: group.score } : {}),
    legCount: games.length,
    ...(lastGame?.gameId ? { gameId: lastGame.gameId } : {}),
    legs,
  };
}

function buildKnockoutStages(brackets: RawBracket[] | undefined): KnockoutStage[] {
  if (!brackets?.length) return [];
  const stages: KnockoutStage[] = [];
  for (const bracket of brackets) {
    for (const stage of bracket.stages ?? []) {
      if (stage.hasStandings) continue;
      const groups = stage.groups ?? [];
      if (!groups.length) continue;
      const sorted = [...groups].sort((a, b) => a.num - b.num);
      stages.push({
        num: stage.num,
        name: stage.name,
        matchups: sorted.map(buildMatchup),
      });
    }
  }
  return stages;
}

export type CompetitionStandingsAndBrackets = {
  tables: StandingsTable[];
  knockoutStages: KnockoutStage[];
};

export async function fetchCompetitionStandingsAndBrackets(competitionId: number): Promise<CompetitionStandingsAndBrackets> {
  const commonParams = {
    appTypeId: APP_TYPE_ID,
    langId: LANGUAGE_ID,
    timezoneName: DEFAULT_TIMEZONE,
    userCountryId: COUNTRY_ID,
    competitions: competitionId,
  };

  const [standingsRes, bracketsRes] = await Promise.allSettled([
    axios.get<{ standings: RawStandings[] }>(`${SCORES_365_API_URL}/standings`, { params: commonParams }),
    axios.get<{ brackets: RawBracket[] }>(`${SCORES_365_API_URL}/brackets/`, { params: commonParams }),
  ]);

  let tables: StandingsTable[] = [];
  if (standingsRes.status === 'fulfilled') {
    tables = buildTables(standingsRes.value.data.standings?.[0]);
  } else {
    logger.warn(`failed to fetch standings for ${competitionId}: ${standingsRes.reason}`);
  }

  let knockoutStages: KnockoutStage[] = [];
  if (bracketsRes.status === 'fulfilled') {
    knockoutStages = buildKnockoutStages(bracketsRes.value.data.brackets);
  } else {
    logger.warn(`failed to fetch brackets for ${competitionId}: ${bracketsRes.reason}`);
  }

  return { tables, knockoutStages };
}
