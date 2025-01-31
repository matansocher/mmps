import type { ObjectId } from 'mongodb';

export interface SubscriptionModel {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly planId: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
}
