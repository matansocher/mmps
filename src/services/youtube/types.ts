export type YouTubeChannel = {
  readonly id: string;
  readonly name: string;
  readonly handle?: string;
  readonly description?: string;
  readonly subscriberCount: number;
  readonly videoCount: number;
  readonly viewCount?: number;
  readonly thumbnailUrl?: string;
  readonly customUrl?: string;
};

export type YouTubeVideo = {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly description?: string;
  readonly duration: number;
  readonly durationFormatted: string;
  readonly publishedAt: string;
  readonly stats: YouTubeVideoStats;
  readonly channel?: YouTubeVideoChannel;
  readonly transcriptLanguages?: readonly string[];
  readonly thumbnailUrl?: string;
};

export type YouTubeVideoStats = {
  readonly views: number;
  readonly likes: number;
  readonly comments?: number;
};

export type YouTubeVideoChannel = {
  readonly id?: string;
  readonly name?: string;
  readonly handle?: string;
};

export type YouTubeTranscript = {
  readonly content: readonly TranscriptChunk[] | string;
  readonly lang?: string;
  readonly duration?: number;
};

export type TranscriptChunk = {
  readonly text: string;
  readonly start: number;
  readonly end?: number;
};

export type YouTubeRSSVideo = {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly publishedAt: string;
  readonly author: string;
};

export type ChannelVideosResponse = {
  readonly videoIds: readonly string[];
  readonly shortIds: readonly string[];
  readonly liveIds: readonly string[];
};

export type SupadataChannelResponse = {
  readonly id?: string;
  readonly name?: string;
  readonly title?: string;
  readonly handle?: string;
  readonly description?: string;
  readonly subscriberCount?: number;
  readonly videoCount?: number;
  readonly viewCount?: number;
  readonly thumbnail?: string;
  readonly customUrl?: string;
};

export type SupadataChannelVideosResponse = {
  readonly videoIds?: readonly string[];
  readonly shortIds?: readonly string[];
  readonly liveIds?: readonly string[];
};

export type SupadataVideoResponse = {
  readonly id?: string;
  readonly title?: string;
  readonly description?: string;
  readonly duration?: number;
  readonly uploadDate?: string;
  readonly publishedAt?: string;
  readonly viewCount?: number;
  readonly likeCount?: number;
  readonly commentCount?: number;
  readonly channel?: {
    readonly id?: string;
    readonly name?: string;
    readonly handle?: string;
  };
  readonly transcriptLanguages?: readonly string[];
  readonly thumbnail?: string;
};

export type TranscriptResponse = {
  readonly content?: readonly TranscriptChunk[] | string;
  readonly lang?: string;
  readonly duration?: number;
  readonly jobId?: string;
};

export type TranscriptJobResponse = {
  readonly status: 'queued' | 'active' | 'completed' | 'failed';
  readonly result?: YouTubeTranscript;
  readonly error?: string;
};
