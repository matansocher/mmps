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

export type TopicLevelKey = `${Topic}:${Level}`;

export async function countByTopicAndLevel(): Promise<Record<TopicLevelKey, number>> {
  const rows = await getCollection()
    .aggregate<{ _id: { topic: Topic; level: Level }; count: number }>([
      { $group: { _id: { topic: '$topic', level: '$level' }, count: { $sum: 1 } } },
    ])
    .toArray();
  const out = {} as Record<TopicLevelKey, number>;
  for (const row of rows) {
    out[`${row._id.topic}:${row._id.level}` as TopicLevelKey] = row.count;
  }
  return out;
}
