import type { UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { FlightTrafficState } from '../types';
import { DB_NAME, STATE_COLLECTION } from './constants';

function getCollection() {
  return getMongoCollection<FlightTrafficState>(DB_NAME, STATE_COLLECTION);
}

export async function getTrafficState(countryAlpha2: string): Promise<FlightTrafficState | null> {
  return getCollection().findOne({ _id: countryAlpha2 });
}

export async function setTrafficState(countryAlpha2: string, isLowTraffic: boolean, lowSince: Date | null): Promise<UpdateResult<FlightTrafficState>> {
  return getCollection().updateOne({ _id: countryAlpha2 }, { $set: { isLowTraffic, lowSince, updatedAt: new Date() } }, { upsert: true });
}
