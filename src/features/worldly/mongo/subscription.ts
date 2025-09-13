import { Collection, Db, InsertOneResult } from 'mongodb';
import { getMongoCollection, getMongoDb } from '@core/mongo/shared';
import { Subscription } from '../types';
import { COLLECTIONS, DB_NAME } from './constants';

let db: Db;
let subscriptionCollection: Collection<Subscription>;

(async () => {
  db = await getMongoDb(DB_NAME);
  subscriptionCollection = getMongoCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);
})();

export async function getActiveSubscriptions(): Promise<{ chatId: number }[]> {
  return subscriptionCollection
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
  const filter = { chatId };
  return subscriptionCollection.findOne(filter);
}

export async function addSubscription(chatId: number): Promise<InsertOneResult<Subscription>> {
  const subscription = {
    chatId,
    isActive: true,
    createdAt: new Date(),
  } as Subscription;
  return subscriptionCollection.insertOne(subscription);
}

export async function updateSubscription(chatId: number, toUpdate: Partial<Subscription>): Promise<void> {
  const filter = { chatId };
  const updateObj = { $set: { ...toUpdate } };
  await subscriptionCollection.updateOne(filter, updateObj);
}
