import { Collection, Db, InsertOneResult } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { SubscriptionModel } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../quizzy-mongo.config';

@Injectable()
export class QuizzyMongoSubscriptionService {
  private readonly subscriptionCollection: Collection<SubscriptionModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.subscriptionCollection = this.db.collection(COLLECTIONS.SUBSCRIPTION);
  }

  // return only active subscriptions that do no have an open question (status = assigned)
  getActiveSubscriptions() {
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

  getSubscription(chatId: number): Promise<SubscriptionModel> {
    const filter = { chatId };
    return this.subscriptionCollection.findOne(filter);
  }

  addSubscription(chatId: number): Promise<InsertOneResult<SubscriptionModel>> {
    const subscription = {
      chatId,
      isActive: true,
      createdAt: new Date(),
    } as SubscriptionModel;
    return this.subscriptionCollection.insertOne(subscription);
  }

  async updateSubscription(chatId: number, toUpdate: Partial<SubscriptionModel>): Promise<void> {
    const filter = { chatId };
    const updateObj = { $set: { ...toUpdate } };
    await this.subscriptionCollection.updateOne(filter, updateObj);
  }
}
