export type YouTubeChannelResponse = {
  readonly kind: string;
  readonly etag: string;
  readonly items: ReadonlyArray<{
    readonly kind: string;
    readonly etag: string;
    readonly id: string;
  }>;
};

export type YouTubeSearchResponse = {
  readonly kind: string;
  readonly etag: string;
  readonly items: ReadonlyArray<{
    readonly kind: string;
    readonly etag: string;
    readonly id: {
      readonly kind: string;
      readonly videoId: string;
    };
    readonly snippet: {
      readonly publishedAt: string;
      readonly channelId: string;
      readonly title: string;
      readonly description: string;
      readonly thumbnails: {
        readonly high: {
          readonly url: string;
        };
      };
      readonly channelTitle: string;
    };
  }>;
  readonly error?: {
    readonly code: number;
    readonly message: string;
  };
};

export type Video = {
  readonly id: string;
  readonly etag: string;
  readonly channelTitle: string;
  readonly title: string;
  readonly description: string;
  readonly publishedAt: string;
  readonly thumbnail: string;
};
