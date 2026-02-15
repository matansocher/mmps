import type { DeleteResult, InsertOneResult, UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from './constants';
import type { CreatePreferenceData, Preference, UpdatePreferenceData } from '../types';

const getCollection = () => getMongoCollection<Preference>(DB_NAME, 'Preferences');

export async function savePreference(data: CreatePreferenceData): Promise<InsertOneResult<Preference> | UpdateResult> {
  const collection = getCollection();

  const existing = await collection.findOne({ key: data.key });

  if (existing) {
    const updateData: UpdatePreferenceData = {
      value: data.value,
      updatedAt: new Date(),
    };
    return collection.updateOne({ key: data.key }, { $set: updateData });
  }

  const preference: Omit<Preference, '_id'> = {
    key: data.key,
    value: data.value,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return collection.insertOne(preference as Preference);
}

export async function getPreference(key: string): Promise<Preference | null> {
  const collection = getCollection();
  return collection.findOne({ key });
}

export async function getAllPreferences(): Promise<Preference[]> {
  const collection = getCollection();
  return collection.find({}).sort({ updatedAt: -1 }).toArray();
}

export async function deletePreference(key: string): Promise<DeleteResult> {
  const collection = getCollection();
  return collection.deleteOne({ key });
}

export async function searchPreferences(keyword: string): Promise<Preference[]> {
  const collection = getCollection();
  const regex = new RegExp(keyword, 'i');
  return collection
    .find({
      $or: [{ key: regex }, { value: regex }],
    })
    .sort({ updatedAt: -1 })
    .toArray();
}
