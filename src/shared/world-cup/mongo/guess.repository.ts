import { getMongoCollection } from '@core/mongo';
import type { Guess } from '../types';
import { DB_NAME, GUESSES_COLLECTION } from './constants';

function getCollection() {
  return getMongoCollection<Guess>(DB_NAME, GUESSES_COLLECTION);
}

export async function upsertGuess(data: Omit<Guess, '_id' | 'createdAt' | 'updatedAt'>): Promise<Guess> {
  const col = getCollection();
  const now = new Date();
  const result = await col.findOneAndUpdate(
    { telegramUserId: data.telegramUserId, matchId: data.matchId },
    {
      $set: { home: data.home, away: data.away, matchdayKey: data.matchdayKey, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );
  return result!;
}

export async function findGuessesByUser(telegramUserId: number): Promise<Guess[]> {
  return getCollection().find({ telegramUserId }).sort({ createdAt: -1 }).toArray();
}

export async function findGuessesByMatchIds(matchIds: number[]): Promise<Guess[]> {
  return getCollection().find({ matchId: { $in: matchIds } }).toArray();
}

export async function findGuessesByMatchday(matchdayKey: string): Promise<Guess[]> {
  return getCollection().find({ matchdayKey }).toArray();
}

export async function findGuessByUserAndMatch(telegramUserId: number, matchId: number): Promise<Guess | null> {
  return getCollection().findOne({ telegramUserId, matchId });
}

export async function findAllGuesses(): Promise<Guess[]> {
  return getCollection().find({}).toArray();
}
