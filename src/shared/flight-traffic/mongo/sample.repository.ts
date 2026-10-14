import type { InsertOneResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { FlightTrafficSample } from '../types';
import { DB_NAME, SAMPLE_TTL_SECONDS, SAMPLES_COLLECTION } from './constants';

function getCollection() {
  return getMongoCollection<FlightTrafficSample>(DB_NAME, SAMPLES_COLLECTION);
}

export async function ensureFlightTrafficIndexes(): Promise<void> {
  const collection = getCollection();
  await collection.createIndex({ sampledAt: 1 }, { expireAfterSeconds: SAMPLE_TTL_SECONDS });
  await collection.createIndex({ countryAlpha2: 1, utcHour: 1, sampledAt: -1 });
}

export async function saveSample(sample: Omit<FlightTrafficSample, '_id'>): Promise<InsertOneResult<FlightTrafficSample>> {
  return getCollection().insertOne(sample as FlightTrafficSample);
}

export async function getSamplesForHour(countryAlpha2: string, utcHour: number, since: Date, before: Date): Promise<FlightTrafficSample[]> {
  return getCollection()
    .find({ countryAlpha2, utcHour, sampledAt: { $gte: since, $lt: before } })
    .toArray();
}
