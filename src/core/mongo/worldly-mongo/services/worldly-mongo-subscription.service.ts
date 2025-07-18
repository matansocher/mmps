import { Collection, Db, InsertOneResult } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { Subscription } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../worldly-mongo.config';

@Injectable()
export class WorldlyMongoSubscriptionService {
  private readonly subscriptionCollection: Collection<Subscription>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
  }

  // return only active subscriptions that do not have an open game (selected field exists in GameLog collection)
  getActiveSubscriptions(): Promise<{ chatId: number }[]> {
    return this.subscriptionCollection
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

  getSubscription(chatId: number): Promise<Subscription> {
    const filter = { chatId };
    return this.subscriptionCollection.findOne(filter);
  }

  addSubscription(chatId: number): Promise<InsertOneResult<Subscription>> {
    const subscription = {
      chatId,
      isActive: true,
      createdAt: new Date(),
    } as Subscription;
    return this.subscriptionCollection.insertOne(subscription);
  }

  async updateSubscription(chatId: number, toUpdate: Partial<Subscription>): Promise<void> {
    const filter = { chatId };
    const updateObj = { $set: { ...toUpdate } };
    await this.subscriptionCollection.updateOne(filter, updateObj);
  }
}
