import type { EaFcLeague, EaFcPlayer, EaFcTeam } from '@services/ea-fc-data';
import type { ObjectId } from 'mongodb';

// Reference documents persisted in MongoDB. `_id` uses the EA numeric id so
// upserts on re-import are idempotent and cross-references are stable.
export type LeagueDocument = EaFcLeague & { readonly _id: number };
export type TeamDocument = EaFcTeam & { readonly _id: number };
export type PlayerDocument = EaFcPlayer & { readonly _id: number };

// A signed-in user, keyed by Google `sub` (or a dev-mode synthetic id).
export type UserDocument = {
  readonly _id: string; // googleSub or dev id
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly provider: 'google' | 'dev';
  readonly createdAt: Date;
  readonly lastActiveAt: Date;
};

// One active career per user for the MVP.
export type CareerDocument = {
  readonly _id: string; // `${userId}` — one career per user in MVP
  readonly userId: string;
  readonly clubTeamId: number;
  readonly leagueId: number;
  readonly seasonNumber: number;
  readonly currentMatchday: number; // 1-based index of the next matchday to play
  readonly createdAt: Date;
};

// A single fixture in a career's league schedule.
export type FixtureDocument = {
  readonly _id?: ObjectId;
  readonly careerId: string;
  readonly leagueId: number;
  readonly seasonNumber: number;
  readonly matchday: number; // 1-based
  readonly homeTeamId: number;
  readonly awayTeamId: number;
  readonly isUserMatch: boolean;
  readonly played: boolean;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly playedAt: Date | null;
};

// A computed row in a league table.
export type StandingRow = {
  readonly teamId: number;
  readonly teamName: string;
  readonly logoUrl: string;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly goalDifference: number;
  readonly points: number;
};

// One persisted goal, used to compute the golden-boot race.
export type GoalScorerDocument = {
  readonly _id?: ObjectId;
  readonly careerId: string;
  readonly seasonNumber: number;
  readonly matchday: number;
  readonly teamId: number;
  readonly playerId: number;
  readonly playerName: string;
};

// A top-scorer row (aggregated across a season).
export type TopScorerRow = {
  readonly playerId: number;
  readonly playerName: string;
  readonly teamId: number;
  readonly teamName: string;
  readonly logoUrl: string;
  readonly faceUrl: string;
  readonly goals: number;
};

// A finished-season snapshot, kept for the season-summary screen + history.
export type SeasonArchiveDocument = {
  readonly _id?: ObjectId;
  readonly careerId: string;
  readonly seasonNumber: number;
  readonly leagueId: number;
  readonly clubTeamId: number;
  readonly clubPosition: number;
  readonly champion: { readonly teamId: number; readonly teamName: string };
  readonly topScorer: { readonly playerId: number; readonly playerName: string; readonly goals: number } | null;
  readonly standings: readonly StandingRow[];
  readonly archivedAt: Date;
};

// --- Transfers (Phase 3) ---

// Per-career player delta: overrides the immutable catalog's clubTeamId once a
// player has moved. Absence of a doc means "still at catalog club".
export type CareerPlayerDocument = {
  readonly _id?: ObjectId;
  readonly careerId: string;
  readonly playerId: number;
  readonly currentTeamId: number;
  readonly updatedAt: Date;
};

// Per-career club state: budget and how many players it has signed in the
// currently open window (reset when a new window opens).
export type CareerTeamDocument = {
  readonly _id?: ObjectId;
  readonly careerId: string;
  readonly teamId: number;
  readonly budget: number; // EUR
  readonly signingsThisWindow: number;
  readonly windowKey: string; // `${seasonNumber}:${windowName}` the counter belongs to
  readonly updatedAt: Date;
};

export type TransferBidStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn';

// A bid the user made for an AI-owned player.
export type TransferBidDocument = {
  readonly _id?: ObjectId;
  readonly careerId: string;
  readonly seasonNumber: number;
  readonly playerId: number;
  readonly playerName: string;
  readonly fromTeamId: number; // seller (AI)
  readonly toTeamId: number; // buyer (user club)
  readonly amount: number; // user's bid
  readonly status: TransferBidStatus;
  readonly counterAmount: number | null; // set when status === 'countered'
  readonly createdAt: Date;
  readonly resolvedAt: Date | null;
};

export type TransferOfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

// An incoming AI bid for one of the user's players.
export type TransferOfferDocument = {
  readonly _id?: ObjectId;
  readonly careerId: string;
  readonly seasonNumber: number;
  readonly playerId: number;
  readonly playerName: string;
  readonly fromTeamId: number; // bidder (AI)
  readonly toTeamId: number; // user club (owner)
  readonly amount: number;
  readonly status: TransferOfferStatus;
  readonly createdAt: Date;
  readonly expiresMatchday: number; // offer lapses once currentMatchday passes this
};

// A completed-deal news item (AI-to-AI, AI-to-user, user-to-AI) for the feed.
export type TransferNewsDocument = {
  readonly _id?: ObjectId;
  readonly careerId: string;
  readonly seasonNumber: number;
  readonly matchday: number;
  readonly playerId: number;
  readonly playerName: string;
  readonly fromTeamId: number;
  readonly fromTeamName: string;
  readonly toTeamId: number;
  readonly toTeamName: string;
  readonly amount: number;
  readonly createdAt: Date;
};

// --- Live match (Phase 4) ---

// A persisted in-progress live match for the user's fixture. The timeline is
// recomputed deterministically from `decisions`, so only the decisions and a
// playback cursor (`minute`) need to be stored, not the whole event stream.
export type LiveMatchDecision = {
  readonly minute: number;
  readonly side: 'home' | 'away';
  readonly mentality?: 'defensive' | 'balanced' | 'attacking';
  readonly overallDelta?: number;
  readonly outPlayerId?: number; // for subs: who came off (progression minutes)
  readonly inPlayerId?: number; // for subs: who came on
  readonly label?: string; // e.g. "Sub: X on for Y" or "Mentality: attacking"
};

export type LiveMatchDocument = {
  readonly _id?: ObjectId;
  readonly careerId: string;
  readonly seasonNumber: number;
  readonly matchday: number;
  readonly homeTeamId: number;
  readonly awayTeamId: number;
  readonly userSide: 'home' | 'away'; // which side the manager controls
  readonly minute: number; // playback cursor (0..90); decisions can only target >= this
  readonly decisions: readonly LiveMatchDecision[];
  readonly subsUsed: number;
  readonly status: 'in_progress' | 'finished';
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

// --- Progression (Phase 5) ---

// Per-career, per-player live attributes overlaid on the immutable catalog. The
// sim reads a player's EFFECTIVE overall = catalog base + these. Absence of a
// doc means "default progress" (form 0, morale 70, fitness 100, no aging drift).
export type CareerPlayerStatsDocument = {
  readonly _id?: ObjectId;
  readonly careerId: string;
  readonly playerId: number;
  readonly form: number; // -5..+5
  readonly morale: number; // 0..100
  readonly fitness: number; // 0..100
  readonly overallDelta: number; // permanent aging drift
  readonly yellowCards: number; // running total this season (resets on suspension / season)
  readonly injuredUntilMatchday: number | null; // unavailable while currentMatchday <= this
  readonly suspendedUntilMatchday: number | null; // unavailable while currentMatchday <= this
  readonly agedForSeason: number | null; // last seasonNumber this player's aging was applied
  readonly updatedAt: Date;
};

// The user's persistent starting XI for a career. Reused every matchday until
// the manager changes it or a listed player becomes unavailable (auto-filled).
export type CareerLineupDocument = {
  readonly _id?: ObjectId;
  readonly careerId: string;
  readonly playerIds: readonly number[]; // ordered; up to 11 — index i fills formation slot i
  readonly formationId?: string; // e.g. '4-3-3'; defaults to DEFAULT_FORMATION
  readonly updatedAt: Date;
};

// Availability of a player for selection (drives the Squad tab + XI picker).
export type PlayerAvailability = 'available' | 'injured' | 'suspended';
