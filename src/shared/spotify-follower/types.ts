import type { ObjectId } from 'mongodb';

export type Subscription = {
  readonly _id?: ObjectId;
  readonly showId: string;
  readonly showName: string;
  readonly chatId: number;
  readonly lastEpisodeId: string | null;
  readonly lastEpisodeReleaseDate: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateSubscriptionData = {
  readonly showId: string;
  readonly showName: string;
  readonly chatId: number;
  readonly lastEpisodeId: string | null;
  readonly lastEpisodeReleaseDate: string | null;
};

export type UpdateSubscriptionData = {
  readonly lastEpisodeId?: string;
  readonly lastEpisodeReleaseDate?: string;
  readonly showName?: string;
};
