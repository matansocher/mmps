import { Collection, Db, InsertOneResult } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { Subscription } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../quizzy-mongo.config';

@Injectable()
export class QuizzyMongoSubscriptionService {
  private readonly subscriptionCollection: Collection<Subscription>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
  }

  // return only active subscriptions that do not have an open question (status = assigned)
  getActiveSubscriptions(): Promise<{ chatId: number }[]> {
    return this.subscriptionCollection
      .aggregate<{ chatId: number }>([
        { $match: { isActive: true } },
        { $lookup: { from: COLLECTIONS.QUESTION, localField: 'chatId', foreignField: 'chatId', as: 'relatedRecords' } },
        {
          $addFields: {
            hasAssigned: {
              $anyElementTrue: {
                $map: { input: '$relatedRecords', as: 'rec', in: { $eq: ['$$rec.status', 'assigned'] } },
              },
            },
          },
        },
        { $match: { hasAssigned: false } },
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
