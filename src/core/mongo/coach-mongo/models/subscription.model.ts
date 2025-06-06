import type { ObjectId } from 'mongodb';

export interface SubscriptionModel {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isActive: boolean;
  readonly customLeagues?: number[];
  readonly createdAt: Date;
}
