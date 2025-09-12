import { endOfDay, startOfDay } from 'date-fns';
import { InsertOneResult, ObjectId } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared';
import { Exercise } from '../models';
import { COLLECTIONS, DB_NAME } from '../trainer-mongo.config';

export async function addExercise(chatId: number): Promise<InsertOneResult<Exercise>> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Exercise>(db, COLLECTIONS.EXERCISE);

  const exercise = {
    _id: new ObjectId(),
    chatId,
    createdAt: new Date(),
  };

  return collection.insertOne(exercise);
}

export async function getTodayExercise(chatId: number): Promise<Exercise> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Exercise>(db, COLLECTIONS.EXERCISE);

  const now = new Date();
  const localStart = startOfDay(now);
  const localEnd = endOfDay(now);
  const utcStart = new Date(localStart.getTime() + now.getTimezoneOffset() * 60000);
  const utcEnd = new Date(localEnd.getTime() + now.getTimezoneOffset() * 60000);

  const filter = { chatId, createdAt: { $gte: utcStart, $lt: utcEnd } };
  return collection.findOne(filter);
}

export async function getExercises(chatId: number, limit: number = 1000): Promise<Exercise[]> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Exercise>(db, COLLECTIONS.EXERCISE);

  return collection.find({ chatId }).sort({ createdAt: -1 }).limit(limit).toArray();
}
