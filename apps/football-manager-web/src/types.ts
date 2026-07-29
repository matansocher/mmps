export type League = {
  readonly eaLeagueId: number;
  readonly name: string;
  readonly country: string;
  readonly icon: string;
  readonly teamCount: number;
};

export type Team = {
  readonly eaTeamId: number;
  readonly name: string;
  readonly leagueId: number;
  readonly logoUrl: string;
  readonly overall: number;
  readonly playerCount: number;
};

export type Player = {
  readonly eaPlayerId: number;
  readonly shortName: string;
  readonly positions: string[];
  readonly overall: number;
  readonly potential: number;
  readonly age: number;
  readonly nationalityName: string;
  readonly faceUrl: string;
  readonly flagUrl: string;
  readonly jerseyNumber: number | null;
  readonly faceStats: {
    readonly pace: number;
    readonly shooting: number;
    readonly passing: number;
    readonly dribbling: number;
    readonly defending: number;
    readonly physical: number;
  };
};

export type PlayerAvailability = 'available' | 'injured' | 'suspended';

export type SquadPlayer = Player & {
  readonly effectiveOverall: number;
  readonly form: number; // -5..+5
  readonly morale: number; // 0..100
  readonly fitness: number; // 0..100
  readonly availability: PlayerAvailability;
  readonly injuredUntilMatchday: number | null;
  readonly suspendedUntilMatchday: number | null;
  readonly yellowCards: number;
};

export type SquadResponse = {
  readonly team: Team;
  readonly players: SquadPlayer[];
  readonly lineup: number[];
  readonly resolvedStarters: number[];
  readonly currentMatchday: number;
  readonly formationId: string;
  readonly formations: readonly FormationDef[];
};

export type FormationSlotDef = {
  readonly role: string;
  readonly x: number; // 0 (own goal) .. 1 (opponent goal), HOME orientation
  readonly y: number; // 0 (top) .. 1 (bottom)
};

export type FormationDef = {
  readonly id: string;
  readonly name: string;
  readonly slots: readonly FormationSlotDef[];
};

export type Career = {
  readonly _id: string;
  readonly clubTeamId: number;
  readonly leagueId: number;
  readonly seasonNumber: number;
  readonly currentMatchday: number;
};

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

export type MatchGoal = {
  readonly minute: number;
  readonly teamId: number;
  readonly playerId: number;
  readonly playerName: string;
};

export type AdvanceResult = {
  readonly matchday: number;
  readonly seasonComplete: boolean;
  readonly userMatch: {
    readonly homeTeamId: number;
    readonly awayTeamId: number;
    readonly homeTeamName: string;
    readonly awayTeamName: string;
    readonly homeGoals: number;
    readonly awayGoals: number;
    readonly goals: MatchGoal[];
  } | null;
  readonly otherResults: readonly {
    readonly homeTeamName: string;
    readonly awayTeamName: string;
    readonly homeGoals: number;
    readonly awayGoals: number;
  }[];
};

export type Mentality = 'defensive' | 'balanced' | 'attacking';

export type TimelineEvent = {
  readonly minute: number;
  readonly type: 'kickoff' | 'chance' | 'goal' | 'halftime' | 'fulltime';
  readonly side?: 'home' | 'away';
  readonly text: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly playerName?: string;
};

export type BallFrame = {
  readonly minute: number;
  readonly x: number; // 0 (home goal) .. 1 (away goal)
  readonly y: number; // 0 .. 1
  readonly possession: 'home' | 'away';
};

export type LiveDecision = {
  readonly minute: number;
  readonly side: 'home' | 'away';
  readonly mentality?: Mentality;
  readonly overallDelta?: number;
  readonly label?: string;
};

export type PlayerDot = {
  readonly x: number;
  readonly y: number;
};

export type PlayerFrame = {
  readonly minute: number;
  readonly home: readonly PlayerDot[];
  readonly away: readonly PlayerDot[];
};

export type SideStats = {
  readonly possessionPct: number;
  readonly shots: number;
  readonly shotsOnTarget: number;
  readonly passes: number;
  readonly tackles: number;
  readonly corners: number;
  readonly fouls: number;
};

export type LiveMatchView = {
  readonly minute: number;
  readonly finished: boolean;
  readonly homeTeamId: number;
  readonly awayTeamId: number;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly userSide: 'home' | 'away';
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly finalHomeGoals: number;
  readonly finalAwayGoals: number;
  readonly userMentality: Mentality;
  readonly subsUsed: number;
  readonly subsRemaining: number;
  readonly events: readonly TimelineEvent[];
  readonly frames: readonly BallFrame[];
  readonly playerFrames: readonly PlayerFrame[];
  readonly stats: { readonly home: SideStats; readonly away: SideStats };
  readonly formationId: string;
  readonly decisions: readonly LiveDecision[];
};

export type LiveSquadPlayer = {
  readonly playerId: number;
  readonly name: string;
  readonly overall: number;
  readonly positions: readonly string[];
};

export type LiveMatchSquads = {
  readonly onPitch: readonly LiveSquadPlayer[];
  readonly bench: readonly LiveSquadPlayer[];
};

export type FixtureRow = {
  readonly matchday: number;
  readonly homeTeamId: number;
  readonly awayTeamId: number;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly homeLogoUrl: string;
  readonly awayLogoUrl: string;
  readonly isUserMatch: boolean;
  readonly played: boolean;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
};

export type TopScorer = {
  readonly playerId: number;
  readonly playerName: string;
  readonly teamId: number;
  readonly teamName: string;
  readonly logoUrl: string;
  readonly faceUrl: string;
  readonly goals: number;
};

export type SeasonSummary = {
  readonly seasonNumber: number;
  readonly clubPosition: number;
  readonly champion: { readonly teamId: number; readonly teamName: string };
  readonly topScorer: { readonly playerId: number; readonly playerName: string; readonly teamName: string; readonly goals: number } | null;
  readonly standings: readonly StandingRow[];
};

export type SessionUser = {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly avatarUrl?: string;
};

export type AuthConfig = {
  readonly googleEnabled: boolean;
  readonly devLoginEnabled: boolean;
  readonly clientId: string | null;
};

export type MarketPlayer = {
  readonly playerId: number;
  readonly name: string;
  readonly positions: string[];
  readonly overall: number;
  readonly potential: number | null;
  readonly age: number;
  readonly value: number;
  readonly teamId: number;
  readonly teamName: string;
  readonly logoUrl: string;
  readonly faceUrl: string;
};

export type OutgoingBid = {
  readonly id: string;
  readonly playerId: number;
  readonly playerName: string;
  readonly teamName: string;
  readonly amount: number;
  readonly status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn';
  readonly counterAmount: number | null;
};

export type IncomingOffer = {
  readonly id: string;
  readonly playerId: number;
  readonly playerName: string;
  readonly fromTeamName: string;
  readonly amount: number;
  readonly expiresMatchday: number;
  readonly faceUrl: string;
  readonly overall: number | null;
  readonly positions: string[];
};

export type TransferNewsItem = {
  readonly playerName: string;
  readonly fromTeamName: string;
  readonly toTeamName: string;
  readonly amount: number;
  readonly matchday: number;
};

export type TransfersDashboard = {
  readonly budget: number;
  readonly signingsThisWindow: number;
  readonly window: 'summer' | 'winter' | null;
  readonly windowOpen: boolean;
  readonly bids: OutgoingBid[];
  readonly offers: IncomingOffer[];
  readonly news: TransferNewsItem[];
};

export type BidOutcome = { readonly outcome: 'accept' | 'reject' | 'counter'; readonly counterAmount?: number | null; readonly bidId?: string };

export type MarketQuery = {
  readonly name?: string;
  readonly position?: string;
  readonly leagueId?: number;
  readonly maxValue?: number;
  readonly minOverall?: number;
};

export type MeResponse = {
  readonly userId: string;
  readonly hasCareer: boolean;
  readonly career: Career | null;
};
