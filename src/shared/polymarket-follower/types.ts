import type { ObjectId } from 'mongodb';

export type SubscriptionType = 'binary' | 'multi';

export type OutcomeSnapshot = {
  readonly outcome: string;
  readonly probability: number;
};

export type Subscription = {
  readonly _id?: ObjectId;
  readonly marketId: string;
  readonly marketSlug: string;
  readonly marketQuestion: string;
  readonly chatId: number;
  readonly type: SubscriptionType;
  readonly lastNotifiedPrice: number | null;
  readonly lastNotifiedOutcomes?: OutcomeSnapshot[] | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateSubscriptionData = {
  readonly marketId: string;
  readonly marketSlug: string;
  readonly marketQuestion: string;
  readonly chatId: number;
  readonly type?: SubscriptionType;
};

export type UpdateSubscriptionData = {
  readonly lastNotifiedPrice?: number;
  readonly lastNotifiedOutcomes?: OutcomeSnapshot[];
  readonly marketQuestion?: string;
};
