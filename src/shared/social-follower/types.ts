import type { ObjectId } from 'mongodb';

export type SocialPlatform = 'tiktok' | 'twitter' | 'youtube' | 'telegram';

export type SocialSubscription = {
  readonly _id?: ObjectId;
  readonly platform: SocialPlatform;
  readonly username: string; // twitter/tiktok/telegram handle, or youtube channel id (UC...)
  readonly displayName?: string | null; // pretty name for notifications (youtube/telegram channel title)
  readonly chatId: number;
  readonly lastSeenId: string | null; // newest post id seen (twitter/tiktok ids are chronological)
  readonly lastSeenAt: Date | null; // newest post timestamp seen (youtube - video ids are not chronological)
  readonly secUid?: string | null; // tiktok only: persistent user id, cached so we don't re-resolve it every run
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

export type PendingPost = {
  readonly _id?: ObjectId;
  readonly platform: SocialPlatform;
  readonly username: string;
  readonly displayName?: string | null;
  readonly chatId: number;
  readonly postId: string | null; // platform post id, used for dedupe on collector retries
  readonly text: string | null;
  readonly url: string | null;
  readonly imageUrls?: string[]; // twitter only: attached photo urls, sent as an album after the text digest
  readonly postedAt: Date;
  readonly collectedAt: Date;
};

export type CreatePendingPostData = Omit<PendingPost, '_id' | 'collectedAt'>;

// Per-chat, per-local-digest-date delivery record for the TikTok video attachments that ride
// along with the daily digest. It fixes the video selection once (so restarts/concurrent runs
// converge on the same set), snapshots each video's fields (so deleting the source pending
// posts doesn't lose what's needed to send/retry), and tracks state so a video is claimed and
// finalized exactly once per run.
export type DigestVideoState = 'pending' | 'sending' | 'sent' | 'link_only';

export type DigestVideoEntry = {
  readonly entryId: string; // stable per-entry id (source PendingPost _id hex), used for atomic claims
  readonly pendingPostId?: ObjectId; // original PendingPost _id, kept for traceability
  readonly username: string;
  readonly displayName?: string | null;
  readonly postId: string | null;
  readonly url: string | null;
  readonly text: string | null;
  readonly state: DigestVideoState;
  readonly telegramMessageId?: number;
};

// Same claim/finalize lifecycle as videos, for tweet photo albums (sent by url — Telegram fetches
// them from X directly, so there is no local download). `link_only` = album failed, link was sent.
export type DigestImageEntry = {
  readonly entryId: string; // source PendingPost _id hex
  readonly username: string;
  readonly displayName?: string | null;
  readonly postId: string | null;
  readonly url: string | null;
  readonly text: string | null;
  readonly imageUrls: string[];
  readonly state: DigestVideoState;
};

export type DigestDelivery = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly digestDate: string; // YYYY-MM-DD in Asia/Jerusalem
  readonly textDeliveredAt?: Date | null;
  readonly videos: DigestVideoEntry[];
  readonly images?: DigestImageEntry[]; // absent on records created before image support
  readonly createdAt: Date;
};

export type CreateDigestDeliveryData = {
  readonly chatId: number;
  readonly digestDate: string;
  readonly videos: DigestVideoEntry[];
  readonly images: DigestImageEntry[];
};
