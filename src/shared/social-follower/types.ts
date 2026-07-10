import type { ObjectId } from 'mongodb';

export type SocialPlatform = 'tiktok' | 'twitter' | 'youtube';

export type SocialSubscription = {
  readonly _id?: ObjectId;
  readonly platform: SocialPlatform;
  readonly username: string; // twitter/tiktok handle, or youtube channel id (UC...)
  readonly displayName?: string | null; // pretty name for notifications (youtube channel title)
  readonly chatId: number;
  readonly lastSeenId: string | null; // newest post id seen (twitter/tiktok ids are chronological)
  readonly lastSeenAt: Date | null; // newest post timestamp seen (youtube - video ids are not chronological)
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateSocialSubscriptionData = {
  readonly platform: SocialPlatform;
  readonly username: string;
  readonly displayName?: string | null;
  readonly chatId: number;
  readonly lastSeenId?: string | null;
  readonly lastSeenAt?: Date | null;
};

export type UpdateLastSeenData = {
  readonly lastSeenId?: string;
  readonly lastSeenAt?: Date;
};
