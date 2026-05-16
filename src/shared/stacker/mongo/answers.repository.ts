import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { AnswerLog } from '../types';
import { DB_NAME } from './constants';

const getCollection = () => getMongoCollection<AnswerLog>(DB_NAME, 'Answers');

export async function logAnswer(chatId: number, sessionId: ObjectId, questionId: ObjectId, correct: boolean): Promise<void> {
  const entry: AnswerLog = {
    _id: new ObjectId(),
    chatId,
    sessionId,
    questionId,
    correct,
    answeredAt: new Date(),
  };
  await getCollection().insertOne(entry);
}
