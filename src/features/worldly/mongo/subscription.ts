import { InsertOneResult } from 'mongodb';
import { Subscription } from '../types';
import { getCollection } from './connection';
import { COLLECTIONS } from './constants';

export async function getActiveSubscriptions(): Promise<{ chatId: number }[]> {
  const subscriptionCollection = await getCollection<Subscription>(COLLECTIONS.SUBSCRIPTION);
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
  const subscriptionCollection = await getCollection<Subscription>(COLLECTIONS.SUBSCRIPTION);
  const filter = { chatId };
  return subscriptionCollection.findOne(filter);
}

export async function addSubscription(chatId: number): Promise<InsertOneResult<Subscription>> {
  const subscriptionCollection = await getCollection<Subscription>(COLLECTIONS.SUBSCRIPTION);
  const subscription = {
    chatId,
    isActive: true,
    createdAt: new Date(),
  } as Subscription;
  return subscriptionCollection.insertOne(subscription);
}

export async function updateSubscription(chatId: number, toUpdate: Partial<Subscription>): Promise<void> {
  const subscriptionCollection = await getCollection<Subscription>(COLLECTIONS.SUBSCRIPTION);
  const filter = { chatId };
  const updateObj = { $set: { ...toUpdate } };
  await subscriptionCollection.updateOne(filter, updateObj);
}
