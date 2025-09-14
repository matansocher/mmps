import { endOfDay, startOfDay } from 'date-fns';
import { InsertOneResult, ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Exercise } from '../types';
import { DB_NAME } from './index';

const getCollection = () => getMongoCollection<Exercise>(DB_NAME, 'Exercise');

export async function addExercise(chatId: number): Promise<InsertOneResult<Exercise>> {
  const exerciseCollection = getCollection();
  const exercise = {
    _id: new ObjectId(),
    chatId,
    createdAt: new Date(),
  };
  return exerciseCollection.insertOne(exercise);
}

export async function getTodayExercise(chatId: number): Promise<Exercise> {
  const exerciseCollection = getCollection();
  const now = new Date();

  const localStart = startOfDay(now);
  const localEnd = endOfDay(now);

  const utcStart = new Date(localStart.getTime() + now.getTimezoneOffset() * 60000);
  const utcEnd = new Date(localEnd.getTime() + now.getTimezoneOffset() * 60000);

  const filter = { chatId, createdAt: { $gte: utcStart, $lt: utcEnd } };
  return exerciseCollection.findOne(filter);
}

export async function getExercises(chatId: number, limit: number = 1000): Promise<Exercise[]> {
  const exerciseCollection = getCollection();
  return exerciseCollection.find({ chatId }).sort({ createdAt: -1 }).limit(limit).toArray();
}
