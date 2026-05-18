import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../../services/scores-365/scores-365.config';
import type { LineupPlayer, LineupSide, MatchEvent, MatchSide, MatchSummary, RoundInfo } from './dto';
import { classifyStatus, toMatchSummary } from './transformers';
import type { MatchDetails, Team } from '@services/scores-365';

const logger = new Logger('CoachMatchFetcher');

type RawMember = {
  id: number;
  athleteId: number;
  competitorId?: number;
  name: string;
  shortName?: string;
  jerseyNumber?: number;
  imageVersion?: number;
};

type RawLineupMember = {
  id: number;
  status?: number;
  statusText?: string;
  position?: { name?: string; shortName?: string };
  formation?: { name?: string; shortName?: string };
  yardFormation?: { line: number; fieldPosition: number; fieldLine: number; fieldSide: number };
  ranking?: number;
};

type RawCompetitor = {
  id: number;
  name: string;
  symbolicName?: string;
  score?: number;
  color?: string;
  lineups?: {
    status?: string;
    formation?: string;
    members?: RawLineupMember[];
  };
};

type RawEvent = {
  competitorId: number;
  gameTime: number;
  addedTime?: number;
  gameTimeDisplay?: string;
  playerId?: number;
  extraPlayers?: number[];
  isMajor?: boolean;
  eventType?: { id: number; name: string; subTypeId?: number; subTypeName?: string };
};

type RawGame = {
  id: number;
  startTime: string;
  statusText?: string;
  shortStatusText?: string;
  gameTime: number;
  addedTime?: number;
  competitionId?: number;
  competitionDisplayName?: string;
  roundName?: string;
  roundNum?: number;
  seasonNum?: number;
  stageName?: string;
  venue?: { name?: string };
  tvNetworks?: Array<{ name: string }>;
  homeCompetitor: RawCompetitor;
  awayCompetitor: RawCompetitor;
  members?: RawMember[];
  events?: RawEvent[];
};

export type RichMatchData = {
  summary: MatchSummary;
  venue?: string;
  stage?: string;
  channel?: string;
  round?: RoundInfo;
  events: MatchEvent[];
  homeLineup?: LineupSide;
  awayLineup?: LineupSide;
};

export async function fetchRichMatch(matchId: number): Promise<RichMatchData | null> {
  try {
    const params = {
      appTypeId: String(APP_TYPE_ID),
      langId: String(LANGUAGE_ID),
      timezoneName: DEFAULT_TIMEZONE,
      gameId: String(matchId),
      userCountryId: String(COUNTRY_ID),
    };
    const res = await axios.get(`${SCORES_365_API_URL}/game?${new URLSearchParams(params)}`);
    const game: RawGame | undefined = res.data?.game;
    if (!game) return null;

    const summary = toMatchSummary(toMatchDetails(game), game.competitionId ?? 0);
    const memberIndex = buildMemberIndex(game.members ?? []);

    return {
      summary,
      venue: game.venue?.name || undefined,
      stage: game.stageName || undefined,
      channel: game.tvNetworks?.[0]?.name || undefined,
      round: buildRound(game),
      events: (game.events ?? []).map((e) => mapEvent(e, game.homeCompetitor.id, memberIndex)),
      homeLineup: buildLineup(game.homeCompetitor, memberIndex),
      awayLineup: buildLineup(game.awayCompetitor, memberIndex),
    };
  } catch (err) {
    logger.error(`fetchRichMatch failed: ${err}`);
    return null;
  }
}

function toMatchDetails(game: RawGame): MatchDetails {
  const home = game.homeCompetitor;
  const away = game.awayCompetitor;
  const pickTeam = (c: RawCompetitor): Team => ({
    id: c.id,
    name: c.name,
    symbolicName: c.symbolicName ?? '',
    score: c.score ?? -1,
    color: c.color ?? '',
  });
  return {
    id: game.id,
    startTime: game.startTime,
    statusText: game.statusText ?? '',
    gameTime: game.gameTime,
    stage: game.stageName ?? '',
    venue: game.venue?.name ?? '',
    homeCompetitor: pickTeam(home),
    awayCompetitor: pickTeam(away),
    channel: game.tvNetworks?.[0]?.name ?? '',
  };
}

function buildMemberIndex(members: RawMember[]): Map<number, RawMember> {
  const map = new Map<number, RawMember>();
  for (const m of members) map.set(m.id, m);
  return map;
}

function buildRound(game: RawGame): RoundInfo | undefined {
  if (!game.competitionDisplayName && !game.roundName && !game.seasonNum) return undefined;
  return {
    competition: game.competitionDisplayName || undefined,
    round: game.roundName || undefined,
    roundNumber: game.roundNum,
    season: game.seasonNum,
  };
}

function mapEvent(e: RawEvent, homeId: number, memberIndex: Map<number, RawMember>): MatchEvent {
  const side: MatchSide = e.competitorId === homeId ? 'home' : 'away';
  const player = e.playerId ? memberIndex.get(e.playerId) : undefined;
  const extras = (e.extraPlayers ?? [])
    .map((id) => memberIndex.get(id)?.name)
    .filter((n): n is string => Boolean(n));
  return {
    minute: e.gameTime,
    addedTime: e.addedTime,
    minuteDisplay: e.gameTimeDisplay,
    side,
    isMajor: Boolean(e.isMajor),
    typeId: e.eventType?.id ?? 0,
    typeName: e.eventType?.name ?? '',
    subTypeName: e.eventType?.subTypeName,
    playerName: player?.name,
    extraPlayerNames: extras.length ? extras : undefined,
  };
}

function buildLineup(competitor: RawCompetitor, memberIndex: Map<number, RawMember>): LineupSide | undefined {
  const lineup = competitor.lineups;
  if (!lineup?.members?.length) return undefined;

  const all: LineupPlayer[] = lineup.members.map((lm) => {
    const m = memberIndex.get(lm.id);
    return {
      memberId: lm.id,
      athleteId: m?.athleteId ?? 0,
      name: m?.name ?? '',
      shortName: m?.shortName,
      jerseyNumber: m?.jerseyNumber,
      position: lm.position?.name,
      formationPosition: lm.formation?.name,
      yardLine: lm.yardFormation?.line,
      yardSide: lm.yardFormation?.fieldSide,
      ranking: lm.ranking,
      isStarting: lm.status === 1,
    };
  });

  return {
    formation: lineup.formation || undefined,
    status: lineup.status || undefined,
    starting: all.filter((p) => p.isStarting),
    bench: all.filter((p) => !p.isStarting),
  };
}

// re-export so the controller can pick this up cleanly
export { classifyStatus };
