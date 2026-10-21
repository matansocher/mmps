import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { CompetitionDetails, MatchDetails, UpcomingMatch } from '@services/scores-365';
import { classifyMatchStatus } from './classify-match-status';
import type { MatchStatus } from './classify-match-status';

export type MatchCard = {
  readonly id: number;
  readonly date: string; // Format: "YYYY-MM-DD" (Asia/Jerusalem)
  readonly time: string; // Format: "HH:mm" (Asia/Jerusalem)
  readonly home: string;
  readonly away: string;
  readonly homeId?: number;
  readonly awayId?: number;
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly status: MatchStatus;
  readonly minute: number | null;
  readonly channel: string | null;
};

export type MatchCardGroup = {
  readonly competition: string;
  readonly competitionId?: number;
  readonly matches: MatchCard[];
};

function toScore(score: number): number | null {
  return score === -1 || score === undefined || score === null ? null : score;
}

export function toMatchCard(match: MatchDetails): MatchCard {
  const status = classifyMatchStatus(match);
  return {
    id: match.id,
    date: formatInTimeZone(match.startTime, DEFAULT_TIMEZONE, 'yyyy-MM-dd'),
    time: formatInTimeZone(match.startTime, DEFAULT_TIMEZONE, 'HH:mm'),
    home: match.homeCompetitor.name,
    away: match.awayCompetitor.name,
    homeId: match.homeCompetitor.id,
    awayId: match.awayCompetitor.id,
    homeScore: status === 'scheduled' ? null : toScore(match.homeCompetitor.score),
    awayScore: status === 'scheduled' ? null : toScore(match.awayCompetitor.score),
    status,
    minute: status === 'live' && match.gameTime > 0 ? Math.floor(match.gameTime) : null,
    channel: match.channel || null,
  };
}

export function toMatchCardGroups(details: readonly CompetitionDetails[]): MatchCardGroup[] {
  return details
    .filter((detail) => detail?.matches?.length)
    .map(({ competition, matches }) => ({
      competition: competition.name,
      competitionId: competition.id,
      matches: [...matches].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map(toMatchCard),
    }));
}

type UpcomingCardMatch = Pick<UpcomingMatch, 'id' | 'competitionName' | 'startTime' | 'homeTeam' | 'awayTeam'> & Partial<Pick<UpcomingMatch, 'competitionId'>>;

export function upcomingMatchesToCardGroups(matches: readonly UpcomingCardMatch[]): MatchCardGroup[] {
  const groups = new Map<string, MatchCard[]>();
  const competitionIds = new Map<string, number>();
  const sorted = [...matches].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  for (const match of sorted) {
    const cards = groups.get(match.competitionName) ?? [];
    cards.push({
      id: match.id,
      date: formatInTimeZone(match.startTime, DEFAULT_TIMEZONE, 'yyyy-MM-dd'),
      time: formatInTimeZone(match.startTime, DEFAULT_TIMEZONE, 'HH:mm'),
      home: match.homeTeam.name,
      away: match.awayTeam.name,
      homeId: match.homeTeam.id,
      awayId: match.awayTeam.id,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      minute: null,
      channel: null,
    });
    groups.set(match.competitionName, cards);
    if (match.competitionId && !competitionIds.has(match.competitionName)) {
      competitionIds.set(match.competitionName, match.competitionId);
    }
  }
  return [...groups.entries()].map(([competition, cards]) => ({ competition, competitionId: competitionIds.get(competition), matches: cards }));
}
