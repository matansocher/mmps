import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Topic } from '../types';
import { DB_NAME } from './index';

const getCollection = () => getMongoCollection<Topic>(DB_NAME, 'Topic');

export async function createTopic(chatId: number, title: string): Promise<Topic> {
  const topicCollection = getCollection();
  const topic: Topic = {
    _id: new ObjectId(),
    title,
    createdBy: chatId,
    createdAt: new Date(),
  };
  await topicCollection.insertOne(topic);
  return topic;
}

export async function getRandomTopic(chatId: number, excludedTopics: string[]): Promise<Topic | null> {
  const topicCollection = getCollection();
  const filter = {
    _id: { $nin: excludedTopics.map((topicId) => new ObjectId(topicId)) },
    $or: [
      { createdBy: chatId }, // Topics created by the user
      { createdBy: { $exists: false } }, // Topics without createdBy field
    ],
  };
  const results = await topicCollection
    .aggregate<Topic>([
      { $match: filter },
      { $sample: { size: 1 } }, // Get a random topic
    ])
    .toArray();
  return results[0] || null;
}

export async function getTopic(id: string): Promise<Topic> {
  const topicCollection = getCollection();
  const filter = { _id: new ObjectId(id) };
  return topicCollection.findOne(filter);
}
