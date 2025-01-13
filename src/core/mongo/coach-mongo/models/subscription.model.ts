import type { ObjectId } from 'mongodb';

export interface SubscriptionModel {
  _id: ObjectId;
  chatId: number;
  isActive: boolean;
  createdAt: Date;
}
