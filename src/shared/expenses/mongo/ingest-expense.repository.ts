import { type InsertOneResult, type ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME, INGEST_EXPENSES_COLLECTION } from '../constants';

export type IngestExpense = {
  readonly _id?: ObjectId;
  readonly vendor: string;
  readonly amount: number;
  readonly currency: string;
  readonly receivedAt: Date;
};

export type CreateIngestExpenseData = Omit<IngestExpense, '_id' | 'receivedAt'>;

const getCollection = () => getMongoCollection<IngestExpense>(DB_NAME, INGEST_EXPENSES_COLLECTION);

export async function ensureIngestExpenseIndexes(): Promise<void> {
  await getCollection().createIndex({ receivedAt: -1 });
}

export async function createIngestExpense(data: CreateIngestExpenseData): Promise<InsertOneResult<IngestExpense>> {
  return getCollection().insertOne({ ...data, receivedAt: new Date() } as IngestExpense);
}

export async function getIngestExpensesBetween(from: Date, to: Date): Promise<IngestExpense[]> {
  return getCollection()
    .find({ receivedAt: { $gte: from, $lt: to } })
    .sort({ receivedAt: -1 })
    .toArray();
}
