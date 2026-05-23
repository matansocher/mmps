import type { MatchDetails } from '@services/scores-365';
import type { MatchStatus } from '@shared/sports';
import type { Guess, LeaderboardEntry } from '@shared/world-cup';
import { WORLD_CUP_TEAMS } from '@shared/world-cup';

function getFlag(teamId: number): string {
  return WORLD_CUP_TEAMS.find((t) => t.id === teamId)?.flag ?? '';
}

export type MatchDto = {
  readonly id: number;
  readonly startTime: string;
  readonly status: MatchStatus;
  readonly statusText: string;
  readonly stage: string;
  readonly venue: string;
  readonly home: { readonly id: number; readonly name: string; readonly flag: string; readonly score: number };
  readonly away: { readonly id: number; readonly name: string; readonly flag: string; readonly score: number };
  readonly myGuess?: { readonly home: number; readonly away: number; readonly points?: number };
};

export type LeaderboardDto = {
  readonly entries: LeaderboardEntry[];
  readonly myRank?: number;
};

export type MatchdayDto = {
  readonly matchdayKey: string;
  readonly matches: MatchDto[];
};

export type UserStatsDto = {
  readonly accuracy: number;
  readonly exactCount: number;
  readonly gdCount: number;
  readonly resultCount: number;
  readonly wrongCount: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly bestTeam?: { readonly name: string; readonly flag: string; readonly accuracy: number };
  readonly worstTeam?: { readonly name: string; readonly flag: string; readonly accuracy: number };
};

export type ProfileDto = {
  readonly telegramUserId: number;
  readonly firstName: string;
  readonly displayName?: string;
  readonly username?: string;
  readonly totalPoints: number;
  readonly guessCount: number;
  readonly notificationsEnabled: boolean;
  readonly stats?: UserStatsDto;
};

export type TeamStatRow = {
  readonly name: string;
  readonly homeValue: string;
  readonly awayValue: string;
};

export type H2HDto = {
  readonly teamStats: readonly TeamStatRow[];
  readonly gamesPlayed: string;
  readonly communityPrediction: { readonly home: number; readonly draw: number; readonly away: number };
};

export type GuessBody = {
  readonly matchId: number;
  readonly home: number;
  readonly away: number;
};

export type GuessResponse = {
  readonly success: boolean;
  readonly guess: Guess;
};

export type MatchSide = 'home' | 'away';

export type MatchEventDto = {
  readonly minute: number;
  readonly addedTime?: number;
  readonly minuteDisplay?: string;
  readonly side: MatchSide;
  readonly isMajor: boolean;
  readonly typeId: number;
  readonly typeName: string;
  readonly subTypeName?: string;
  readonly playerName?: string;
  readonly extraPlayerNames?: readonly string[];
};

export type LineupPlayerDto = {
  readonly memberId: number;
  readonly athleteId: number;
  readonly name: string;
  readonly shortName?: string;
  readonly jerseyNumber?: number;
  readonly position?: string;
  readonly isStarting: boolean;
};

export type LineupSideDto = {
  readonly formation?: string;
  readonly starting: readonly LineupPlayerDto[];
  readonly bench: readonly LineupPlayerDto[];
};

export type MatchDetailDto = {
  readonly match: MatchDto;
  readonly venue?: string;
  readonly stage?: string;
  readonly channel?: string;
  readonly events: readonly MatchEventDto[];
  readonly homeLineup?: LineupSideDto;
  readonly awayLineup?: LineupSideDto;
};

export function toMatchDto(m: MatchDetails, status: MatchStatus, guess?: Guess, points?: number): MatchDto {
  return {
    id: m.id,
    startTime: m.startTime,
    status,
    statusText: m.statusText,
    stage: m.stage || '',
    venue: m.venue,
    home: { id: m.homeCompetitor.id, name: m.homeCompetitor.name, flag: getFlag(m.homeCompetitor.id), score: m.homeCompetitor.score },
    away: { id: m.awayCompetitor.id, name: m.awayCompetitor.name, flag: getFlag(m.awayCompetitor.id), score: m.awayCompetitor.score },
    myGuess: guess ? { home: guess.home, away: guess.away, points } : undefined,
  };
}
