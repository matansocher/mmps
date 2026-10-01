import { MongoServerError } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { HELLS_KITCHEN_DB_NAME } from '../constants';
import type { Profile, Save } from '../game/types';

type Document = Save & { readonly _id: string };
const collection = () => getMongoCollection<Document>(HELLS_KITCHEN_DB_NAME, 'profiles');
export async function getProfile(): Promise<Save | null> {
  const result = await collection().findOne({ _id: 'personal' });
  return result ? { revision: result.revision, profile: result.profile, updatedAt: result.updatedAt } : null;
}
export async function saveProfile(revision: number, profile: Profile): Promise<Save | null> {
  const save: Document = { _id: 'personal', revision: revision + 1, profile, updatedAt: new Date().toISOString() };
  if (revision === 0) {
    try {
      await collection().insertOne(save);
      return { revision: save.revision, profile, updatedAt: save.updatedAt };
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) return null;
      throw error;
    }
  }
  const result = await collection().findOneAndUpdate({ _id: 'personal', revision }, { $set: { profile, updatedAt: save.updatedAt }, $inc: { revision: 1 } }, { returnDocument: 'after' });
  return result ? { revision: result.revision, profile: result.profile, updatedAt: result.updatedAt } : null;
}
