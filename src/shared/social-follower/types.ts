import type { ObjectId } from 'mongodb';

export type SocialPlatform = 'tiktok' | 'twitter';

export type SocialSubscription = {
  readonly _id?: ObjectId;
  readonly platform: SocialPlatform;
  readonly username: string;
  readonly chatId: number;
  readonly lastSeenId: string | null; // newest post id seen (twitter/tiktok ids are chronological)
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateSocialSubscriptionData = {
  readonly platform: SocialPlatform;
  readonly username: string;
  readonly chatId: number;
  readonly lastSeenId?: string | null;
};

export type UpdateLastSeenData = {
  readonly lastSeenId?: string;
};
