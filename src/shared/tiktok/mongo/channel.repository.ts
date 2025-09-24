import { InsertOneResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Channel } from '../types';
import { DB_NAME } from './index';

const getCollection = () => getMongoCollection<Channel>(DB_NAME, 'Channel');

export async function getFollowedChannels(): Promise<Channel[]> {
  const channelCollection = getCollection();
  return channelCollection.find({}).toArray();
}

export async function addChannel(username: string): Promise<InsertOneResult<Channel>> {
  const channelCollection = getCollection();
  const channel = {
    username,
    createdAt: new Date(),
  } as Channel;
  return channelCollection.insertOne(channel);
}

export async function getChannel(username: string): Promise<Channel> {
  const channelCollection = getCollection();
  return channelCollection.findOne({ username });
}

export async function removeChannel(username: string): Promise<void> {
  const channelCollection = getCollection();
  const filter = { username };
  await channelCollection.deleteOne(filter);
}
