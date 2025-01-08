import type { ObjectId } from 'mongodb';

export interface SubscriptionModel {
  _id: ObjectId;
  chatId: number;
  planId: number;
  isActive: boolean;
  createdAt: Date;
}
