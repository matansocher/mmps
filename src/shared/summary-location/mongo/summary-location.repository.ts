import { getMongoCollection } from '@core/mongo';
import type { SummaryLocationSetting } from '../types';
import { COLLECTION_NAME, DB_NAME, SUMMARY_LOCATION_ID } from './constants';

const getCollection = () => getMongoCollection<SummaryLocationSetting>(DB_NAME, COLLECTION_NAME);

export async function getSavedSummaryLocation(): Promise<string | null> {
  const setting = await getCollection().findOne({ _id: SUMMARY_LOCATION_ID });
  return setting?.location ?? null;
}

export async function saveSummaryLocation(location: string): Promise<void> {
  await getCollection().updateOne({ _id: SUMMARY_LOCATION_ID }, { $set: { location, updatedAt: new Date() } }, { upsert: true });
}
