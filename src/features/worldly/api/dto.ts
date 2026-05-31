export type GameMode = 'map' | 'us_map' | 'flag' | 'capital' | 'random';

export type GameOption = {
  readonly id: string;
  readonly label: string;
};

export type GameQuestionResponse = {
  readonly gameId: string;
  readonly mode: Exclude<GameMode, 'random'>;
  readonly prompt: {
    readonly text?: string;
    readonly imageUrl?: string;
    readonly flagEmoji?: string;
  };
  readonly options: ReadonlyArray<GameOption>;
};

export type NewGameBody = {
  readonly mode: GameMode;
};

export type AnswerBody = {
  readonly selected: string;
};

export type AnswerResponse = {
  readonly correct: boolean;
  readonly correctId: string;
  readonly correctLabel: string;
  readonly correctEmoji?: string;
  readonly correctHebrewCapital?: string;
};

export type ModeStats = {
  readonly mode: Exclude<GameMode, 'random'>;
  readonly total: number;
  readonly correct: number;
  readonly accuracyPct: number;
};

export type WeakestEntry = {
  readonly name: string;
  readonly hebrewName: string;
  readonly misses: number;
};

export type StatsResponse = {
  readonly totalGames: number;
  readonly answeredGames: number;
  readonly correctGames: number;
  readonly accuracyPct: number;
  readonly todayGames: number;
  readonly todayCorrect: number;
  readonly currentDayStreak: number;
  readonly longestDayStreak: number;
  readonly currentCorrectStreak: number;
  readonly longestCorrectStreak: number;
  readonly perMode: ReadonlyArray<ModeStats>;
  readonly weakest: ReadonlyArray<WeakestEntry>;
};

export type SubscriptionResponse = {
  readonly isActive: boolean;
};

export type SubscriptionUpdateBody = {
  readonly isActive: boolean;
};
