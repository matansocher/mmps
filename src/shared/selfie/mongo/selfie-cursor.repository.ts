import type { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from './selfie-event.repository';

export type ChannelCursor = {
  readonly _id?: ObjectId;
  readonly channelId: string;
  readonly lastMessageId: number;
  readonly updatedAt: Date;
};

const getCollection = () => getMongoCollection<ChannelCursor>(DB_NAME, 'ChannelCursors');

export async function getChannelCursor(channelId: string): Promise<number | null> {
  const cursor = await getCollection().findOne({ channelId });
  return cursor?.lastMessageId ?? null;
}

export async function setChannelCursor(channelId: string, lastMessageId: number): Promise<void> {
  await getCollection().updateOne({ channelId }, { $set: { lastMessageId, updatedAt: new Date() } }, { upsert: true });
}
