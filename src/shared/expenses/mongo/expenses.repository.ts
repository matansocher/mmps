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

export async function getAllExpensesByEffectiveCategory(category: ExpenseCategory): Promise<Expense[]> {
  const col = getCollection();
  return col
    .find({ $or: [{ userCategory: category }, { userCategory: { $exists: false }, category }] })
    .sort({ transactionDate: -1 })
    .toArray();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getAllExpensesByEffectiveVendor(vendorName: string): Promise<Expense[]> {
  const col = getCollection();
  const safe = escapeRegex(vendorName.trim());
  const exact = new RegExp(`^${safe}$`, 'i');
  return col
    .find({
      $or: [
        { userVendor: exact },
        { userVendor: { $exists: false }, vendor: exact },
        { userVendor: null, vendor: exact },
      ],
    })
    .sort({ transactionDate: -1 })
    .toArray();
}

export type BulkVendorUpdate = {
  readonly userVendor?: string | null;
  readonly userCategory?: ExpenseCategory | null;
};

export async function bulkUpdateExpensesByEffectiveVendor(vendorName: string, updates: BulkVendorUpdate): Promise<number> {
  const col = getCollection();
  const safe = escapeRegex(vendorName.trim());
  const exact = new RegExp(`^${safe}$`, 'i');
  const filter = {
    $or: [
      { userVendor: exact },
      { userVendor: { $exists: false }, vendor: exact },
      { userVendor: null, vendor: exact },
    ],
  };
  const set: Record<string, unknown> = {};
  const unset: Record<string, ''> = {};

  if (updates.userVendor !== undefined) {
    if (updates.userVendor === null || updates.userVendor === '') unset.userVendor = '';
    else set.userVendor = updates.userVendor.trim();
  }
  if (updates.userCategory !== undefined) {
    if (updates.userCategory === null) unset.userCategory = '';
    else set.userCategory = updates.userCategory;
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length > 0) update.$set = set;
  if (Object.keys(unset).length > 0) update.$unset = unset;
  if (Object.keys(update).length === 0) return 0;

  const result = await col.updateMany(filter, update);
  return result.modifiedCount;
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

export type UserOverrides = {
  readonly userVendor?: string | null;
  readonly userCategory?: ExpenseCategory | null;
  readonly userType?: import('../types').ExpenseType | null;
};

export async function updateUserOverrides(id: string, overrides: UserOverrides): Promise<Expense | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = getCollection();
  const set: Record<string, unknown> = {};
  const unset: Record<string, ''> = {};

  if (overrides.userVendor !== undefined) {
    if (overrides.userVendor === null || overrides.userVendor === '') unset.userVendor = '';
    else set.userVendor = overrides.userVendor.trim();
  }
  if (overrides.userCategory !== undefined) {
    if (overrides.userCategory === null) unset.userCategory = '';
    else set.userCategory = overrides.userCategory;
  }
  if (overrides.userType !== undefined) {
    if (overrides.userType === null) unset.userType = '';
    else set.userType = overrides.userType;
  }

  const update: Record<string, unknown> = {};
  if (Object.keys(set).length > 0) update.$set = set;
  if (Object.keys(unset).length > 0) update.$unset = unset;
  if (Object.keys(update).length === 0) return col.findOne({ _id: new ObjectId(id) });

  await col.updateOne({ _id: new ObjectId(id) }, update);
  return col.findOne({ _id: new ObjectId(id) });
}
