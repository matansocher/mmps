export type YouTubeVideo = {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnailUrl: string;
  url: string;
};

export type YouTubeSearchResult = {
  success: boolean;
  videos?: YouTubeVideo[];
  error?: string;
};
