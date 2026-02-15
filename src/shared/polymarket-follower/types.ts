import type { ObjectId } from 'mongodb';

export type Subscription = {
  readonly _id?: ObjectId;
  readonly marketId: string;
  readonly marketSlug: string;
  readonly marketQuestion: string;
  readonly chatId: number;
  readonly lastNotifiedPrice: number | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateSubscriptionData = {
  readonly marketId: string;
  readonly marketSlug: string;
  readonly marketQuestion: string;
  readonly chatId: number;
};

export type UpdateSubscriptionData = {
  readonly lastNotifiedPrice?: number;
  readonly marketQuestion?: string;
};
