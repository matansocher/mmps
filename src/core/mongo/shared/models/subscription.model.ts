import type { ObjectId } from 'mongodb';

export interface SubscriptionModel {
  _id?: ObjectId;
  chatId: number;
  restaurant: string;
  isActive: boolean;
  createdAt: number;
}
