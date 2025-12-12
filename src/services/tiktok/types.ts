export type TikTokVideo = {
  readonly id: string;
  readonly url: string;
  readonly description: string;
  readonly createdAt: string;
  readonly stats: TikTokVideoStats;
  readonly duration: number;
  readonly author: TikTokAuthor;
  readonly music?: TikTokMusic;
};

export type TikTokVideoStats = {
  readonly views: number;
  readonly likes: number;
  readonly comments: number;
  readonly shares: number;
};

export type TikTokAuthor = {
  readonly id: string;
  readonly username: string;
  readonly nickname: string;
  readonly avatarUrl?: string;
};

export type TikTokMusic = {
  readonly id: string;
  readonly title: string;
  readonly author: string;
};

export type TikTokUserInfo = {
  readonly id: string;
  readonly username: string;
  readonly nickname: string;
  readonly avatarUrl: string;
  readonly bio: string;
  readonly followerCount: number;
  readonly followingCount: number;
  readonly videoCount: number;
  readonly likeCount: number;
  readonly verified: boolean;
  readonly secUid?: string;
};

export type TikTokTranscript = {
  readonly content: readonly TranscriptChunk[] | string;
  readonly lang?: string;
  readonly duration?: number;
};

export type TranscriptChunk = {
  readonly text: string;
  readonly start: number;
  readonly end: number;
};

export type TikTokMetadata = {
  readonly platform: 'tiktok';
  readonly type: 'video';
  readonly id: string;
  readonly url: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly author: {
    readonly username: string;
    readonly displayName: string;
    readonly avatarUrl: string;
    readonly verified: boolean;
  };
  readonly stats: {
    readonly views: number | null;
    readonly likes: number | null;
    readonly comments: number | null;
    readonly shares: number | null;
  };
  readonly media: {
    readonly type: 'video';
    readonly duration: number;
    readonly thumbnailUrl: string;
  };
  readonly tags: readonly string[];
  readonly createdAt: string;
};

export type UserVideosResponse = {
  readonly videos: readonly TikTokVideo[];
  readonly hasMore: boolean;
  readonly cursor: string;
  readonly totalCount?: number;
};

// ==================== Internal API Response Types ====================

export type RapidAPIVideoItem = {
  readonly id: string;
  readonly desc?: string;
  readonly createTime?: number;
  readonly stats?: {
    readonly playCount?: number;
    readonly diggCount?: number;
    readonly commentCount?: number;
    readonly shareCount?: number;
  };
  readonly playCount?: number;
  readonly diggCount?: number;
  readonly commentCount?: number;
  readonly shareCount?: number;
  readonly video?: {
    readonly duration?: number;
  };
  readonly duration?: number;
  readonly author?: {
    readonly id?: string;
    readonly uniqueId?: string;
    readonly nickname?: string;
    readonly avatarThumb?: string;
  };
  readonly music?: {
    readonly id?: string;
    readonly title?: string;
    readonly authorName?: string;
  };
};

export type RapidAPIUserPostsResponse = {
  readonly data?: {
    readonly itemList?: readonly RapidAPIVideoItem[];
    readonly hasMore?: boolean;
    readonly cursor?: string;
  };
  // Fallback for direct structure
  readonly itemList?: readonly RapidAPIVideoItem[];
  readonly hasMore?: boolean;
  readonly cursor?: string;
};

export type RapidAPIUserInfoResponse = {
  readonly userInfo?: {
    readonly user?: {
      readonly id?: string;
      readonly uniqueId?: string;
      readonly nickname?: string;
      readonly avatarThumb?: string;
      readonly signature?: string;
      readonly verified?: boolean;
      readonly secUid?: string;
    };
    readonly stats?: {
      readonly followerCount?: number;
      readonly followingCount?: number;
      readonly videoCount?: number;
      readonly heartCount?: number;
    };
  };
};

export type TranscriptResponse = {
  readonly content?: readonly TranscriptChunk[] | string;
  readonly lang?: string;
  readonly duration?: number;
  readonly jobId?: string;
};

export type TranscriptJobResponse = {
  readonly status: 'queued' | 'active' | 'completed' | 'failed';
  readonly result?: TikTokTranscript;
  readonly error?: string;
};
