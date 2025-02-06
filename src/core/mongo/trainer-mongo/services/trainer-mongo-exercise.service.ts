import { endOfDay, endOfYear, startOfDay, startOfYear } from 'date-fns';
import { Collection, Db, InsertOneResult, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { ExerciseModel } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../trainer-mongo.config';

@Injectable()
export class TrainerMongoExerciseService {
  private readonly exerciseCollection: Collection<ExerciseModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.exerciseCollection = this.db.collection(COLLECTIONS.EXERCISE);
  }

  addExercise(chatId: number): Promise<InsertOneResult<ExerciseModel>> {
    const exercise = {
      _id: new ObjectId(),
      chatId,
      createdAt: new Date(),
    };
    return this.exerciseCollection.insertOne(exercise);
  }

  getTodayExercise(chatId: number): Promise<ExerciseModel> {
    const now = new Date();

    const localStart = startOfDay(now);
    const localEnd = endOfDay(now);

    const utcStart = new Date(localStart.getTime() + now.getTimezoneOffset() * 60000);
    const utcEnd = new Date(localEnd.getTime() + now.getTimezoneOffset() * 60000);

    const filter = { chatId, createdAt: { $gte: utcStart, $lt: utcEnd } };
    return this.exerciseCollection.findOne(filter);
  }

  getExercises(chatId: number): Promise<ExerciseModel[]> {
    return this.exerciseCollection.find({ chatId }).sort({ createdAt: -1 }).limit(1000).toArray();
  }

  getYearExercises(chatId: number, year: number): Promise<ExerciseModel[]> {
    const start = startOfYear(new Date(`${year}-01-01`));
    const end = endOfYear(new Date(`${year}-01-01`));

    return this.exerciseCollection.find({ chatId, createdAt: { $gte: start, $lt: end } }).toArray();
  }
}
