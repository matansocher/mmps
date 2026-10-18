export type CompetitionDetails = {
  readonly competition: Competition;
  readonly matches: MatchDetails[];
};

export type Competition = {
  readonly id: number;
  readonly name: string;
  readonly icon?: string;
  readonly hasTable?: boolean;
};

export type Competitor = {
  readonly id: number;
  readonly name: string;
};

export type ExpectedTeam = {
  readonly id: number;
  readonly name: string;
  readonly symbolicName: string;
  readonly score: number;
  readonly color: string;
};

export type ExpectedTvNetworks = {
  readonly id: number;
  readonly name: string;
};

export type ExpectedMatch = {
  readonly id: number;
  readonly startTime: string;
  readonly statusText: string;
  readonly gameTime: number;
  readonly stageName: string;
  readonly venue: {
    readonly id: number;
    readonly name: string;
    readonly shortName: string;
  };
  readonly homeCompetitor: ExpectedTeam;
  readonly awayCompetitor: ExpectedTeam;
  readonly tvNetworks: ExpectedTvNetworks[];
};

export type Team = {
  readonly id: number;
  readonly name: string;
  readonly symbolicName: string;
  readonly score: number;
  readonly color: string;
};

export type MatchDetails = {
  readonly id: number;
  readonly startTime: string;
  readonly statusText: string;
  readonly gameTime: number;
  readonly venue: string;
  readonly stage: string;
  readonly homeCompetitor: Team;
  readonly awayCompetitor: Team;
  readonly channel: string;
};

export type UpcomingMatch = {
  readonly id: number;
  readonly sourceCompetitionId: number;
  readonly competitionId: number;
  readonly competitionName: string;
  readonly stage?: string;
  readonly startTime: string;
  readonly venue?: string;
  readonly homeTeam: Competitor;
  readonly awayTeam: Competitor;
  readonly remainingHomeMatches: number;
  readonly remainingAwayMatches: number;
};

export type CompetitionTableDetails = {
  readonly competition: Competition & { icon: string };
  readonly competitionTable: CompetitionTableRow[];
};

export type CompetitionTableRow = {
  readonly competitor: Competitor;
  readonly points: number;
  readonly gamesPlayed: number;
};

export type AthleteGame = {
  readonly id: number;
  readonly startTime: string;
  readonly statusText: string;
  readonly homeCompetitor: Team;
  readonly awayCompetitor: Team;
  readonly gameTime: string;
  readonly venue: string;
  readonly playerStats: any;
};

export type MakavdiaHeader = {
  readonly title?: string;
  readonly description?: string;
  readonly type: number;
  readonly category: number;
};

export type MakavdiaAthleteStat = {
  readonly type: number;
  readonly value: string;
  readonly logo?: boolean;
};

export type MakavdiaCompetitor = {
  readonly id: number;
  readonly countryId: number;
  readonly sportId: number;
  readonly name: string;
  readonly shortName: string;
  readonly score: number;
  readonly isWinner: boolean;
  readonly nameForURL: string;
  readonly type: number;
  readonly popularityRank: number;
  readonly imageVersion: number;
  readonly color: string;
  readonly awayColor: string;
  readonly hasSquad: boolean;
  readonly hasTransfers: boolean;
  readonly competitorNum: number;
  readonly hideOnSearch: boolean;
  readonly hideOnCatalog: boolean;
};

export type MakavdiaGame = {
  readonly id: number;
  readonly sportId: number;
  readonly competitionId: number;
  readonly seasonNum: number;
  readonly stageNum: number;
  readonly groupNum: number;
  readonly competitionDisplayName: string;
  readonly startTime: string;
  readonly statusGroup: number;
  readonly statusText: string;
  readonly shortStatusText: string;
  readonly gameTimeAndStatusDisplayType: number;
  readonly homeCompetitor: MakavdiaCompetitor;
  readonly awayCompetitor: MakavdiaCompetitor;
  readonly winner: number;
  readonly scores: readonly number[];
  readonly homeAwayTeamOrder: number;
  readonly hasPointByPoint: boolean;
  readonly hasVideo: boolean;
};

export type MakavdiaGameResult = {
  readonly game: MakavdiaGame;
  readonly played: boolean;
  readonly hasStats: boolean;
  readonly athleteStats: readonly MakavdiaAthleteStat[];
  readonly relatedCompetitor: number;
};

export type AthleteLastMatches = {
  readonly games: AthleteGame[];
  readonly headers: any[];
};

export type MakavdiaLastMatches = {
  readonly games: readonly MakavdiaGameResult[];
  readonly headers: readonly MakavdiaHeader[];
};

export type AthleteData = {
  readonly id: number;
  readonly name: string;
  readonly lastMatches: AthleteLastMatches;
};

export type MakavdiaAthleteData = {
  readonly id: number;
  readonly name: string;
  readonly lastMatches: MakavdiaLastMatches;
};

export type AthleteApiResponse = {
  readonly athletes: AthleteData[];
};

export type MakavdiaApiResponse = {
  readonly athletes: readonly MakavdiaAthleteData[];
};

export type ScoresCompetitorRef = {
  readonly id: number;
  readonly name: string;
  readonly shortName?: string;
  readonly symbolicName?: string;
  readonly score?: number;
  readonly color?: string;
  readonly countryId?: number;
  readonly isWinner?: boolean;
  // Set on knockout games once the team has gone through.
  readonly isQualified?: boolean;
};

export type ScoresNamedRef = {
  readonly id: number;
  readonly name: string;
  readonly shortName?: string;
};

export type ScoresLineupMember = {
  readonly id: number;
  // 1 = starting, 2 = substitute; statusText also covers "Missing" and "Management".
  readonly status?: number;
  readonly statusText?: string;
  readonly position?: ScoresNamedRef;
  readonly formation?: ScoresNamedRef;
  // fieldLine: 0 (own goal) to 100 (opponent goal); fieldSide: 0 to 100 across the pitch.
  readonly yardFormation?: { readonly line?: number; readonly fieldPosition?: number; readonly fieldLine?: number; readonly fieldSide?: number };
  readonly substitution?: { readonly playerId?: number; readonly time?: number };
  readonly ranking?: number;
  readonly stats?: readonly { readonly type: number; readonly name: string; readonly value: string; readonly isTop?: boolean }[];
};

export type ScoresLineup = {
  readonly status?: string;
  readonly formation?: string;
  readonly members?: readonly ScoresLineupMember[];
};

export type ScoresGameCompetitor = ScoresCompetitorRef & {
  readonly lineups?: ScoresLineup;
  readonly recentMatches?: readonly number[];
};

export type ScoresGame = {
  readonly id: number;
  readonly competitionId: number;
  readonly competitionDisplayName?: string;
  readonly startTime: string;
  // 2 = scheduled, 3 = live, 4 = finished; other values are postponed/cancelled/etc.
  readonly statusGroup: number;
  readonly statusText?: string;
  readonly shortStatusText?: string;
  readonly gameTime?: number;
  readonly gameTimeDisplay?: string;
  readonly roundName?: string;
  readonly roundNum?: number;
  readonly stageNum?: number;
  readonly seasonNum?: number;
  // 2 = probable, 3 = confirmed.
  readonly lineupsStatus?: number;
  readonly homeCompetitor: ScoresCompetitorRef;
  readonly awayCompetitor: ScoresCompetitorRef;
};

export type ScoresGameEvent = {
  readonly competitorId: number;
  readonly order?: number;
  readonly gameTime: number;
  readonly addedTime?: number;
  readonly gameTimeDisplay?: string;
  readonly playerId?: number;
  readonly extraPlayers?: readonly number[];
  readonly eventType?: { readonly id: number; readonly name: string; readonly subTypeId?: number; readonly subTypeName?: string };
};

export type ScoresGameMember = {
  readonly id: number;
  readonly athleteId?: number;
  readonly competitorId?: number;
  readonly name: string;
  readonly shortName?: string;
  readonly jerseyNumber?: number;
};

export type ScoresGameDetails = Omit<ScoresGame, 'homeCompetitor' | 'awayCompetitor'> & {
  readonly bestOdds?: readonly {
    readonly lineTypeId: number;
    readonly options: readonly { readonly num: number; readonly rate?: { readonly decimal?: number } }[];
  }[];
  readonly homeCompetitor: ScoresGameCompetitor;
  readonly awayCompetitor: ScoresGameCompetitor;
  readonly events?: readonly ScoresGameEvent[];
  readonly members?: readonly ScoresGameMember[];
  readonly tvNetworks?: readonly ScoresNamedRef[];
  readonly venue?: { readonly name?: string; readonly capacity?: number };
  readonly officials?: readonly { readonly name: string }[];
  readonly hasStandings?: boolean;
  readonly hasBrackets?: boolean;
  readonly stages?: readonly { readonly id: number; readonly name: string; readonly homeCompetitorScore?: number; readonly awayCompetitorScore?: number; readonly isEnded?: boolean }[];
};

export type ScoresGameStat = {
  readonly id: number;
  readonly name: string;
  readonly competitorId: number;
  readonly value: string;
  readonly isMajor?: boolean;
  readonly order?: number;
};

export type ScoresCompetitorDetails = ScoresCompetitorRef & {
  readonly longName?: string;
  readonly mainCompetitionId?: number;
  readonly awayColor?: string;
};

export type ScoresSquadAthlete = {
  readonly id: number;
  readonly name: string;
  readonly shortName?: string;
  readonly age?: number;
  readonly jerseyNum?: number;
  readonly height?: number;
  readonly position?: ScoresNamedRef;
  readonly formationPosition?: ScoresNamedRef;
};

export type ScoresAthleteStat = {
  readonly type: number;
  readonly name: string;
  readonly value: string;
  readonly isTop?: boolean;
};

export type ScoresAthleteDetails = {
  readonly id: number;
  readonly name: string;
  readonly shortName?: string;
  readonly age?: number;
  readonly jerseyNum?: number;
  readonly clubId?: number;
  readonly nationalityName?: string;
  readonly contractUntil?: string;
  readonly shortBio?: string;
  readonly position?: ScoresNamedRef;
  readonly formationPosition?: ScoresNamedRef;
  readonly playerDetails?: readonly { readonly title: string; readonly value: string }[];
  readonly highlightStats?: readonly { readonly competitionId: number; readonly name: string; readonly stats?: readonly ScoresAthleteStat[] }[];
  readonly lastMatches?: {
    readonly games?: readonly {
      readonly game: ScoresGame;
      readonly relatedCompetitor?: number;
      readonly played?: boolean;
      readonly athleteStats?: readonly { readonly type?: number; readonly value?: string }[];
    }[];
  };
};

export type ScoresStandingsRow = {
  readonly competitor: ScoresCompetitorRef;
  readonly position?: number;
  readonly groupNum?: number | null;
  readonly gamePlayed?: number;
  readonly gamesWon?: number;
  readonly gamesEven?: number;
  readonly gamesLost?: number;
  readonly for?: number;
  readonly against?: number;
  readonly points: number;
  readonly destinationNum?: number;
  // Newest first. 1 = win, 2 = draw, 0 = loss.
  readonly recentForm?: readonly number[];
  // Newest first; used to check the table already includes a result.
  readonly detailedRecentForm?: readonly { readonly id: number }[];
  readonly liveGameId?: number;
  // Position change caused by live games: 1 = up, -1 = down.
  readonly trend?: number;
};

export type ScoresStandings = {
  readonly competitionId: number;
  readonly seasonNum?: number;
  readonly displayName?: string;
  readonly groups?: readonly { readonly num: number; readonly name: string }[] | null;
  readonly rows: readonly ScoresStandingsRow[];
  // type 3 = relegation, 5 = relegation play-off / lower play-off; the rest are qualification zones.
  readonly destinations?: readonly { readonly num: number; readonly name: string; readonly color?: string; readonly type?: number }[];
};

export type ScoresBracketGroup = {
  readonly num: number;
  readonly participants?: readonly { readonly competitorId: number; readonly name: string; readonly isQualified?: boolean }[];
  readonly games?: readonly {
    readonly gameId: number;
    readonly game?: {
      readonly startTime?: string;
      readonly statusGroup?: number;
      readonly homeCompetitor?: { readonly id?: number; readonly score?: number };
      readonly awayCompetitor?: { readonly id?: number; readonly score?: number };
    };
  }[];
  readonly score?: readonly number[];
};

export type ScoresBracket = {
  readonly stages?: readonly { readonly num: number; readonly name: string; readonly hasStandings?: boolean; readonly groups?: readonly ScoresBracketGroup[] }[];
};

export type ScoresCompetitorSearchResult = {
  readonly id: number;
  readonly name: string;
  readonly countryId?: number;
  readonly sportId?: number;
  readonly type?: number;
};

export type ScoresHeadToHead = {
  readonly id: number;
  readonly homeCompetitor: ScoresCompetitorRef & { readonly recentGames?: readonly ScoresGame[] };
  readonly awayCompetitor: ScoresCompetitorRef & { readonly recentGames?: readonly ScoresGame[] };
  readonly h2hGames?: readonly ScoresGame[];
};
