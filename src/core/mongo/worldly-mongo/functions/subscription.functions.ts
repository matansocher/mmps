import { InsertOneResult } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared';
import { Subscription } from '../models';
import { COLLECTIONS, DB_NAME } from '../worldly-mongo.config';

export async function getActiveSubscriptions(): Promise<{ chatId: number }[]> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  return collection
    .aggregate<{ chatId: number }>([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: COLLECTIONS.GAME_LOG,
          let: { subChatId: '$chatId' },
          pipeline: [
            // br
            { $match: { $expr: { $eq: ['$chatId', '$$subChatId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 2 },
          ],
          as: 'latestGameLogs',
        },
      },
      {
        $addFields: {
          hasAnsweredOneOfLastTwo: {
            $cond: {
              if: { $gt: [{ $size: '$latestGameLogs' }, 0] },
              then: {
                $or: [
                  // br
                  { $ne: [{ $type: { $arrayElemAt: ['$latestGameLogs.selected', 0] } }, 'missing'] },
                  { $ne: [{ $type: { $arrayElemAt: ['$latestGameLogs.selected', 1] } }, 'missing'] },
                ],
              },
              else: false,
            },
          },
        },
      },
      { $match: { hasAnsweredOneOfLastTwo: true } },
      { $project: { _id: 0, chatId: 1 } },
    ])
    .toArray();
}

export async function getSubscription(chatId: number): Promise<Subscription> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  const filter = { chatId };
  return collection.findOne(filter);
}

export async function addSubscription(chatId: number): Promise<InsertOneResult<Subscription>> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  const subscription = {
    chatId,
    isActive: true,
    createdAt: new Date(),
  } as Subscription;
  return collection.insertOne(subscription);
}

export async function updateSubscription(chatId: number, toUpdate: Partial<Subscription>): Promise<void> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  const filter = { chatId };
  const updateObj = { $set: { ...toUpdate } };
  await collection.updateOne(filter, updateObj);
}
