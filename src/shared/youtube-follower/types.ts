import type { ObjectId } from 'mongodb';

export type Subscription = {
  readonly _id?: ObjectId;
  readonly channelId: string;
  readonly channelName: string;
  readonly channelHandle?: string;
  readonly channelUrl: string;
  readonly lastNotifiedVideoId: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type NotifiedVideo = {
  readonly _id?: ObjectId;
  readonly videoId: string;
  readonly videoUrl: string;
  readonly notifiedAt: Date;
};

export type CreateSubscriptionData = {
  readonly channelId: string;
  readonly channelName: string;
  readonly channelHandle?: string;
  readonly channelUrl: string;
};

export type UpdateSubscriptionData = {
  readonly lastNotifiedVideoId?: string;
  readonly updatedAt?: Date;
};
