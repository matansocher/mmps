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
