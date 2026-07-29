export type SimTeamInput = {
  readonly teamId: number;
  readonly overall: number; // team strength, ~40-90
  // Candidate scorers, strongest first. Used to attribute goals plausibly.
  readonly scorers: readonly SimScorerInput[];
  // Optional formation-wide tactical lean, applied on top of mentality.
  readonly attackLean?: number; // more chances forward, ~[-3..+3]
  readonly possessionLean?: number; // holds the ball more, ~[-3..+3]
  // Optional 11 slot coordinates (GK first) for the on-pitch player dots. HOME
  // orientation (x: 0 own goal .. 1 opponent goal); the sim mirrors for away.
  readonly slots?: readonly SimSlot[];
};

export type SimSlot = {
  readonly x: number;
  readonly y: number;
};

export type SimScorerInput = {
  readonly playerId: number;
  readonly name: string;
  readonly overall: number;
  readonly isAttacker: boolean; // forwards/mids weighted higher as scorers
};

export type SimGoal = {
  readonly minute: number;
  readonly teamId: number;
  readonly playerId: number;
  readonly playerName: string;
};

export type SimResult = {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly goals: readonly SimGoal[];
};
