import { endOfDay, startOfDay } from 'date-fns';
import { Collection, Db, InsertOneResult, ObjectId } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared';
import { Exercise } from '../types';
import { COLLECTIONS, DB_NAME } from './constants';

let db: Db;
let exerciseCollection: Collection<Exercise>;

(async () => {
  db = await getMongoDb(DB_NAME);
  exerciseCollection = getCollection<Exercise>(db, COLLECTIONS.EXERCISE);
})();

export async function addExercise(chatId: number): Promise<InsertOneResult<Exercise>> {
  const exercise = {
    _id: new ObjectId(),
    chatId,
    createdAt: new Date(),
  };

  return exerciseCollection.insertOne(exercise);
}

export async function getTodayExercise(chatId: number): Promise<Exercise> {
  const now = new Date();
  const localStart = startOfDay(now);
  const localEnd = endOfDay(now);
  const utcStart = new Date(localStart.getTime() + now.getTimezoneOffset() * 60000);
  const utcEnd = new Date(localEnd.getTime() + now.getTimezoneOffset() * 60000);

  const filter = { chatId, createdAt: { $gte: utcStart, $lt: utcEnd } };
  return exerciseCollection.findOne(filter);
}

export async function getExercises(chatId: number, limit: number = 1000): Promise<Exercise[]> {
  return exerciseCollection.find({ chatId }).sort({ createdAt: -1 }).limit(limit).toArray();
}
