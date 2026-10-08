import { getMongoCollection } from '@core/mongo';
import { STICKERS_CARS_SEARCH_COUNTS_COLLECTION, STICKERS_DB_NAME } from '../constants';

type CarsSearchCount = {
  readonly _id: string; // sender's phone number
  readonly count: number;
};

// Atomic and persistent so overlapping messages and restarts keep each sender's cycle.
export async function nextCarsSearchCount(phone: string): Promise<number> {
  const updated = await getMongoCollection<CarsSearchCount>(STICKERS_DB_NAME, STICKERS_CARS_SEARCH_COUNTS_COLLECTION).findOneAndUpdate(
    { _id: phone },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return updated.count;
}
