import type { Collection } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from './constants';

type BotProfileState = {
  readonly _id: string;
  readonly avatarHash: string;
  readonly updatedAt: Date;
};

const STATE_ID = 'profile';

function getCollection(): Collection<BotProfileState> {
  return getMongoCollection<BotProfileState>(DB_NAME, 'BotProfile');
}

export async function getAvatarHash(): Promise<string | undefined> {
  const state = await getCollection().findOne({ _id: STATE_ID });
  return state?.avatarHash;
}

export async function saveAvatarHash(avatarHash: string): Promise<void> {
  await getCollection().updateOne({ _id: STATE_ID }, { $set: { avatarHash, updatedAt: new Date() } }, { upsert: true });
}
