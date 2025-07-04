import type { ObjectId } from 'mongodb';

export interface Subscription {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly restaurant: string;
  readonly restaurantPhoto: string;
  readonly isActive: boolean;
  readonly isSuccess: boolean;
  readonly finishedAt: Date;
  readonly createdAt: Date;
}
