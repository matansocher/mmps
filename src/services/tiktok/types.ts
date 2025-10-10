export type TikTokVideo = {
  readonly id: string;
  readonly url: string;
  description: string;
  uploadDate: string;
};

export type TikTokUser = {
  readonly id: string;
  readonly secUid: string;
  readonly username: string;
};

export type TikTokApiResponse = {
  readonly cursor: number;
  readonly hasMore: boolean;
  readonly itemList: TikTokApiItem[];
  readonly statusCode: number;
  readonly status_code: number;
  readonly status_msg: string;
};

export type TikTokApiItem = {
  readonly id: string;
  readonly desc?: string;
  readonly description?: string;
  readonly createTime?: number;
  readonly createDate?: string;
  readonly [key: string]: any;
};

export type TikTokUniversalData = {
  readonly __DEFAULT_SCOPE__?: {
    readonly 'webapp.user-detail'?: {
      readonly userInfo?: {
        readonly user?: {
          readonly id: string;
          readonly secUid: string;
        };
      };
      readonly itemList?: string[];
    };
    readonly ItemModule?: Record<string, TikTokApiItem>;
    readonly [key: string]: any;
  };
};

export type FetchResult = {
  readonly videos: TikTokVideo[];
  readonly source: 'api' | 'html';
  readonly error?: string;
};
