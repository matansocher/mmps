import type { ObjectId } from 'mongodb';

export type Subscription = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isActive: boolean;
  readonly customLeagues?: number[];
  readonly createdAt: Date;
};
