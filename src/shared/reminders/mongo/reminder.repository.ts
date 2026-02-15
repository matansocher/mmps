import type { InsertOneResult, ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from './constants';
import type { CreateReminderData, Reminder, UpdateReminderData } from '../types';

const getCollection = () => getMongoCollection<Reminder>(DB_NAME, 'Reminders');

export async function createReminder(data: CreateReminderData): Promise<InsertOneResult<Reminder>> {
  const remindersCollection = getCollection();
  const reminder: Omit<Reminder, '_id'> = {
    chatId: data.chatId,
    message: data.message,
    dueDate: data.dueDate,
    status: 'pending',
    createdAt: new Date(),
  };

  return remindersCollection.insertOne(reminder as Reminder);
}

export async function getDueReminders(): Promise<Reminder[]> {
  const remindersCollection = getCollection();
  const now = new Date();

  return remindersCollection
    .find({ status: 'pending', dueDate: { $lte: now } })
    .sort({ dueDate: 1 })
    .toArray();
}

export async function getRemindersByUser(chatId: number, includeCompleted = false): Promise<Reminder[]> {
  const remindersCollection = getCollection();
  const query: any = { chatId };

  if (!includeCompleted) {
    query.status = { $in: ['pending', 'snoozed'] };
  }

  return remindersCollection.find(query).sort({ dueDate: 1 }).toArray();
}

export async function getReminderById(id: string | ObjectId, chatId: number): Promise<Reminder | null> {
  const remindersCollection = getCollection();
  const { ObjectId } = await import('mongodb');

  return remindersCollection.findOne({ _id: new ObjectId(id), chatId });
}

export async function updateReminderStatus(id: string | ObjectId, chatId: number, status: 'completed' | 'snoozed', timestamp?: Date): Promise<boolean> {
  const remindersCollection = getCollection();
  const { ObjectId } = await import('mongodb');

  const update: UpdateReminderData = { status };

  if (status === 'completed') {
    update.completedAt = timestamp || new Date();
  } else if (status === 'snoozed' && timestamp) {
    update.snoozedUntil = timestamp;
  }

  const result = await remindersCollection.updateOne({ _id: new ObjectId(id), chatId }, { $set: update });

  return result.modifiedCount > 0;
}

export async function updateReminder(id: string | ObjectId, chatId: number, updates: UpdateReminderData): Promise<boolean> {
  const remindersCollection = getCollection();
  const { ObjectId } = await import('mongodb');

  const result = await remindersCollection.updateOne({ _id: new ObjectId(id), chatId }, { $set: updates });

  return result.modifiedCount > 0;
}

export async function deleteReminder(id: string | ObjectId, chatId: number): Promise<boolean> {
  const remindersCollection = getCollection();
  const { ObjectId } = await import('mongodb');

  const result = await remindersCollection.deleteOne({ _id: new ObjectId(id), chatId });
  return result.deletedCount > 0;
}

export async function getPendingReminderCount(chatId: number): Promise<number> {
  const remindersCollection = getCollection();

  return remindersCollection.countDocuments({ chatId, status: { $in: ['pending', 'snoozed'] } });
}

export async function reactivateSnoozedReminders(): Promise<number> {
  const remindersCollection = getCollection();
  const now = new Date();

  const result = await remindersCollection.updateMany({ status: 'snoozed', snoozedUntil: { $lte: now } }, { $set: { status: 'pending' }, $unset: { snoozedUntil: '' } });

  return result.modifiedCount;
}
