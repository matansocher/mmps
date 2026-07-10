export type ScrapedTweetMetrics = {
  readonly likes: number;
  readonly retweets: number;
  readonly replies: number;
  readonly views: number;
};

export type ScrapedTweet = {
  readonly id: string;
  readonly text: string;
  readonly createdAt: string; // ISO date string
  readonly url: string | null;
  readonly author: string | null;
  readonly isRetweet: boolean;
  readonly isReply: boolean;
  readonly metrics: ScrapedTweetMetrics | null; // null when fetched via nitter RSS (no engagement data)
};

export type ScrapedUser = {
  readonly name: string;
  readonly username: string;
};

export type ScrapeSource = 'auto' | 'graphql' | 'nitter';

export type FetchLatestPostsOptions = {
  readonly count?: number;
  readonly includeRetweets?: boolean;
  readonly includeReplies?: boolean;
  readonly source?: ScrapeSource;
};

export type LatestPostsResult = {
  readonly user: ScrapedUser;
  readonly source: string; // strategy actually used, e.g. 'graphql' or 'nitter (nitter.net)'
  readonly tweets: ScrapedTweet[];
};
