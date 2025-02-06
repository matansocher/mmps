import type { ObjectId } from 'mongodb';

export interface ExerciseModel {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly createdAt: Date;
}
