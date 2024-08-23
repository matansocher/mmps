import type { ObjectId } from 'mongodb';

export interface SubscriptionModel {
  _id: ObjectId;
  chatId: number;
  symbol: string;
  isActive: boolean;
  createdAt: Date;
}
