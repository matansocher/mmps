import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { ActiveChallenge } from '@features/langly/types';
import { DB_NAME } from './index';

const getCollection = () => getMongoCollection<ActiveChallenge>(DB_NAME, 'ActiveChallenges');

export async function createActiveChallenge(chatId: number, messageId: number, challenge: ActiveChallenge['challenge']): Promise<void> {
  const activeChallengesCollection = getCollection();

  const activeChallenge: ActiveChallenge = {
    _id: new ObjectId(),
    chatId,
    messageId,
    challenge,
    timestamp: new Date(),
  };

  await activeChallengesCollection.insertOne(activeChallenge);
}

export async function getActiveChallenge(chatId: number, messageId: number): Promise<ActiveChallenge | null> {
  const activeChallengesCollection = getCollection();
  const filter = { chatId, messageId };
  return activeChallengesCollection.findOne(filter);
}

export async function deleteActiveChallenge(chatId: number, messageId: number): Promise<void> {
  const activeChallengesCollection = getCollection();
  const filter = { chatId, messageId };
  await activeChallengesCollection.deleteOne(filter);
}

export async function cleanupOldChallenges(): Promise<void> {
  const activeChallengesCollection = getCollection();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const filter = { timestamp: { $lt: oneHourAgo } };
  await activeChallengesCollection.deleteMany(filter);
}
