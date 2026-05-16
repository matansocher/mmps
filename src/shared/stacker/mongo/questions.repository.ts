import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Level, Question, Topic } from '../types';
import { DB_NAME } from './constants';

const getCollection = () => getMongoCollection<Question>(DB_NAME, 'Questions');

export async function countQuestions(): Promise<number> {
  return getCollection().countDocuments();
}

export async function insertQuestions(questions: readonly Question[]): Promise<void> {
  if (questions.length === 0) return;
  await getCollection().insertMany(questions as Question[]);
}

export async function getQuestionById(id: ObjectId): Promise<Question | null> {
  return getCollection().findOne({ _id: id });
}

export async function sampleQuestions(topic: Topic, level: Level, size: number): Promise<Question[]> {
  return getCollection()
    .aggregate<Question>([{ $match: { topic, level } }, { $sample: { size } }])
    .toArray();
}
