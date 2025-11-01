export type Player = {
  readonly id: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly commonName: string;
  readonly photo: string;
  readonly preferredFoot: string;
  readonly overallRating: number;
  readonly position: string;
  readonly team: string;
  readonly teamPhoto: string;
  readonly nationality: string;
  readonly nationalityPhoto: string;
};

export type GameLog = {
  readonly chatId: number;
  readonly gameId: string;
  readonly playerId: number;
  readonly playerName: string;
  readonly hintsRevealed: number;
  readonly guesses: string[];
  readonly isCorrect: boolean;
  readonly score: number;
  readonly createdAt: Date;
  readonly answeredAt?: Date;
};

export type UserStats = {
  readonly chatId: number;
  readonly totalGames: number;
  readonly correctGuesses: number;
  readonly totalScore: number;
  readonly averageHintsUsed: number;
  readonly bestStreak: number;
  readonly currentStreak: number;
  readonly lastPlayedAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type TopPlayerRecord = {
  readonly chatId: number;
  readonly username?: string;
  readonly totalScore: number;
  readonly totalGames: number;
  readonly correctGuesses: number;
  readonly winRate: number;
};

export type GameState = {
  readonly gameId: string;
  readonly playerId: number;
  readonly playerName: string;
  readonly hintsRevealed: number;
  readonly guesses: string[];
  readonly createdAt: Date;
};
