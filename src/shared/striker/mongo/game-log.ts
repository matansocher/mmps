import { getMongoCollection } from '@core/mongo';
import { GameLog } from '../types';
import { DB_NAME } from './index';

type SaveGameLogOptions = {
  readonly chatId: number;
  readonly gameId: string;
  readonly playerId: number;
  readonly playerName: string;
  readonly hintsRevealed: number;
};

type UpdateGameLogOptions = {
  readonly chatId: number;
  readonly gameId: string;
  readonly guess: string;
  readonly hintsRevealed: number;
  readonly isCorrect: boolean;
  readonly score: number;
};

const getCollection = () => getMongoCollection<GameLog>(DB_NAME, 'GameLog');

export async function saveGameLog({ chatId, gameId, playerId, playerName, hintsRevealed }: SaveGameLogOptions): Promise<void> {
  const gameLogCollection = getCollection();
  const gameLog = {
    chatId,
    gameId,
    playerId,
    playerName,
    hintsRevealed,
    guesses: [],
    isCorrect: false,
    score: 0,
    createdAt: new Date(),
  } as GameLog;
  await gameLogCollection.insertOne(gameLog);
}

export async function updateGameLog({ chatId, gameId, guess, hintsRevealed, isCorrect, score }: UpdateGameLogOptions): Promise<void> {
  const gameLogCollection = getCollection();
  const filter = { chatId, gameId };

  const updateObj: any = {
    $set: {
      hintsRevealed,
      isCorrect,
      score,
    },
  };

  if (guess && guess.trim()) {
    updateObj.$push = { guesses: guess };
  }

  if (isCorrect || guess === '[gave up]') {
    updateObj.$set.answeredAt = new Date();
  }

  await gameLogCollection.updateOne(filter, updateObj);
}

export async function getCurrentGame(chatId: number): Promise<GameLog | null> {
  const gameLogCollection = getCollection();
  const filter = { chatId, answeredAt: { $exists: false } };
  return gameLogCollection.findOne(filter);
}

export async function getUserGameLogs(chatId: number): Promise<GameLog[]> {
  const gameLogCollection = getCollection();
  const filter = { chatId };
  return gameLogCollection.find(filter).sort({ createdAt: -1 }).toArray();
}

export async function getCompletedGameLogs(chatId: number): Promise<GameLog[]> {
  const gameLogCollection = getCollection();
  const filter = { chatId, answeredAt: { $exists: true } };
  return gameLogCollection.find(filter).sort({ createdAt: -1 }).toArray();
}
