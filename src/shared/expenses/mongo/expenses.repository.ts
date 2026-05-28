import { ObjectId, type InsertOneResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME, EXPENSES_COLLECTION } from '../constants';
import type { CreateExpenseData, Expense, ExpenseCategory } from '../types';

const getCollection = () => getMongoCollection<Expense>(DB_NAME, EXPENSES_COLLECTION);

export async function ensureExpenseIndexes(): Promise<void> {
  const col = getCollection();
  await col.createIndex({ messageId: 1 }, { unique: true });
  await col.createIndex({ transactionDate: -1 });
  await col.createIndex({ category: 1 });
  await col.createIndex({ userCategory: 1 });
  await col.createIndex({ vendor: 1 });
}

export async function createExpense(data: CreateExpenseData): Promise<InsertOneResult<Expense>> {
  const col = getCollection();
  const expense: Omit<Expense, '_id'> = { ...data, createdAt: new Date() };
  return col.insertOne(expense as Expense);
}

export async function getExpensesBetween(from: Date, to: Date): Promise<Expense[]> {
  const col = getCollection();
  return col
    .find({ transactionDate: { $gte: from, $lt: to } })
    .sort({ transactionDate: -1 })
    .toArray();
}

export async function getRecentExpenses(limit = 20): Promise<Expense[]> {
  const col = getCollection();
  return col.find({}).sort({ transactionDate: -1 }).limit(limit).toArray();
}

export async function getExpensesByCategory(category: ExpenseCategory, from: Date, to: Date): Promise<Expense[]> {
  const col = getCollection();
  return col
    .find({
      $and: [
        { transactionDate: { $gte: from, $lt: to } },
        { $or: [{ userCategory: category }, { userCategory: { $exists: false }, category }] },
      ],
    })
    .sort({ transactionDate: -1 })
    .toArray();
}

export async function getExpensesByVendor(vendor: string, limit = 20): Promise<Expense[]> {
  const col = getCollection();
  return col
    .find({ vendor: { $regex: vendor, $options: 'i' } })
    .sort({ transactionDate: -1 })
    .limit(limit)
    .toArray();
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = getCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function updateUserCategory(id: string, userCategory: ExpenseCategory | null): Promise<Expense | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = getCollection();
  const update = userCategory ? { $set: { userCategory } } : { $unset: { userCategory: '' as const } };
  await col.updateOne({ _id: new ObjectId(id) }, update);
  return col.findOne({ _id: new ObjectId(id) });
}
