import { getMongoCollection } from '@core/mongo';
import { FOOTBALL_MANAGER_DB_NAME, USERS_COLLECTION } from '../constants';
import type { UserDocument } from '../types';

function getUsersCollection() {
  return getMongoCollection<UserDocument>(FOOTBALL_MANAGER_DB_NAME, USERS_COLLECTION);
}

export type UpsertUserInput = {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl?: string;
  readonly provider: 'google' | 'dev';
};

// Upserts the user on sign-in, keyed by provider id (Google `sub` or dev id).
export async function upsertUser(input: UpsertUserInput): Promise<UserDocument> {
  const now = new Date();
  await getUsersCollection().updateOne(
    { _id: input.id },
    {
      $set: { email: input.email, displayName: input.displayName, avatarUrl: input.avatarUrl, provider: input.provider, lastActiveAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
  return getUsersCollection().findOne({ _id: input.id }) as Promise<UserDocument>;
}

export async function getUserById(id: string): Promise<UserDocument | null> {
  return getUsersCollection().findOne({ _id: id });
}
