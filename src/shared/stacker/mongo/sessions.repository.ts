import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Session } from '../types';
import { DB_NAME } from './constants';

const getCollection = () => getMongoCollection<Session>(DB_NAME, 'Sessions');

export async function createSession(session: Omit<Session, '_id'>): Promise<Session> {
  const collection = getCollection();
  const doc: Session = { ...session, _id: new ObjectId() };
  await collection.insertOne(doc as Session);
  return doc;
}

export async function getActiveSession(chatId: number): Promise<Session | null> {
  return getCollection().findOne({ chatId, status: 'active' });
}

export async function updateSession(sessionId: ObjectId, update: Partial<Session>): Promise<void> {
  await getCollection().updateOne({ _id: sessionId }, { $set: update });
}

export async function abandonActiveSessions(chatId: number): Promise<void> {
  await getCollection().updateMany({ chatId, status: 'active' }, { $set: { status: 'abandoned', endedAt: new Date() } });
}
