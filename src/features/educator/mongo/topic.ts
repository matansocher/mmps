import { Collection, Db, ObjectId } from 'mongodb';
import { getMongoCollection, getMongoDb } from '@core/mongo/shared';
import { Topic } from '../types';
import { COLLECTIONS, DB_NAME } from './constants';

let db: Db;
let topicCollection: Collection<Topic>;

(async () => {
  db = await getMongoDb(DB_NAME);
  topicCollection = getMongoCollection<Topic>(db, COLLECTIONS.TOPIC);
})();

export async function createTopic(chatId: number, title: string): Promise<Topic> {
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
  const filter = { _id: new ObjectId(id) };
  return topicCollection.findOne(filter);
}
