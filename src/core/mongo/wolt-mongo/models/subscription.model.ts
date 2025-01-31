import type { ObjectId } from 'mongodb';

export interface SubscriptionModel {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly restaurant: string;
  readonly restaurantPhoto: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
}
