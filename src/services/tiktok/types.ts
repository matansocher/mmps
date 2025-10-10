/**
 * TikTok Video Metadata
 */
export interface TikTokVideo {
  id: string;
  url: string;
  description: string;
  uploadDate: string;
}

/**
 * TikTok User Information
 */
export interface TikTokUser {
  id: string;
  secUid: string;
  username: string;
}

/**
 * TikTok API Response
 */
export interface TikTokApiResponse {
  cursor: number;
  hasMore: boolean;
  itemList: TikTokApiItem[];
  statusCode: number;
  status_code: number;
  status_msg: string;
}

/**
 * TikTok API Video Item
 */
export interface TikTokApiItem {
  id: string;
  desc?: string;
  description?: string;
  createTime?: number;
  createDate?: string;
  [key: string]: any;
}

/**
 * TikTok Internal Data Structures
 */
export interface TikTokUniversalData {
  __DEFAULT_SCOPE__?: {
    'webapp.user-detail'?: {
      userInfo?: {
        user?: {
          id: string;
          secUid: string;
        };
      };
      itemList?: string[];
    };
    ItemModule?: Record<string, TikTokApiItem>;
    [key: string]: any;
  };
}

/**
 * Video Fetcher Result
 */
export interface FetchResult {
  videos: TikTokVideo[];
  source: 'api' | 'html';
  error?: string;
}
