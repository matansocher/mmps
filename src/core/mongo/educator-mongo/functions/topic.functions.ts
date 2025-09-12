import { ObjectId } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared/mongo-connection';
import { COLLECTIONS, DB_NAME } from '../educator-mongo.config';
import { Topic } from '../models';

export async function createTopic(chatId: number, title: string): Promise<Topic> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Topic>(db, COLLECTIONS.TOPIC);

  const topic: Topic = {
    _id: new ObjectId(),
    title,
    createdBy: chatId,
    createdAt: new Date(),
  };
  await collection.insertOne(topic);
  return topic;
}

export async function getRandomTopic(chatId: number, excludedTopics: string[]): Promise<Topic | null> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Topic>(db, COLLECTIONS.TOPIC);

  const filter = {
    _id: { $nin: excludedTopics.map((topicId) => new ObjectId(topicId)) },
    $or: [
      { createdBy: chatId }, // Topics created by the user
      { createdBy: { $exists: false } }, // Topics without createdBy field
    ],
  };
  const results = await collection
    .aggregate<Topic>([
      { $match: filter },
      { $sample: { size: 1 } }, // Get a random topic
    ])
    .toArray();
  return results[0] || null;
}

export async function getTopic(id: string): Promise<Topic> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Topic>(db, COLLECTIONS.TOPIC);

  const filter = { _id: new ObjectId(id) };
  return collection.findOne(filter);
}
