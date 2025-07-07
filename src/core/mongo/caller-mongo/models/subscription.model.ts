import type { ObjectId } from 'mongodb';

export interface Subscription {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly time: string;
  readonly isActive: boolean;
  readonly finishedAt: Date;
  readonly createdAt: Date;
}
