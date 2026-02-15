import { InsertOneResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Subscription } from '../types';
import { DB_NAME } from './constants';

const getCollection = () => getMongoCollection<Subscription>(DB_NAME, 'Subscription');

export async function getActiveSubscriptions(): Promise<{ chatId: number }[]> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection
    .aggregate<{ chatId: number }>([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'GameLog',
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
  const subscriptionCollection = getCollection();
  const filter = { chatId };
  return subscriptionCollection.findOne(filter);
}

export async function addSubscription(chatId: number): Promise<InsertOneResult<Subscription>> {
  const subscriptionCollection = getCollection();
  const subscription = {
    chatId,
    isActive: true,
    createdAt: new Date(),
  } as Subscription;
  return subscriptionCollection.insertOne(subscription);
}

export async function updateSubscription(chatId: number, toUpdate: Partial<Subscription>): Promise<void> {
  const subscriptionCollection = getCollection();
  const filter = { chatId };
  const updateObj = { $set: { ...toUpdate } };
  await subscriptionCollection.updateOne(filter, updateObj);
}
