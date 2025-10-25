export type TwitterUser = {
  readonly id: string;
  readonly name: string;
  readonly username: string;
  readonly description?: string;
  readonly profile_image_url?: string;
  readonly verified: boolean;
  readonly public_metrics: {
    readonly followers_count: number;
    readonly following_count: number;
    readonly tweet_count: number;
    readonly listed_count: number;
  };
};

export type TwitterTweet = {
  readonly id: string;
  readonly text: string;
  readonly created_at: string;
  readonly public_metrics: {
    readonly like_count: number;
    readonly retweet_count: number;
    readonly reply_count: number;
    readonly quote_count: number;
  };
};

export type TwitterUserResponse = {
  readonly data: TwitterUser | null;
};

export type TwitterTweetsResponse = {
  readonly data: TwitterTweet[] | null;
};
