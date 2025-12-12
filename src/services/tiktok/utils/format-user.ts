import type { RapidAPIUserInfoResponse, TikTokUserInfo } from '../types';

export function formatUserInfo(data: RapidAPIUserInfoResponse, username: string): TikTokUserInfo {
  const user = data.userInfo?.user;
  const stats = data.userInfo?.stats;

  return {
    id: user?.id || '',
    username: user?.uniqueId || username,
    nickname: user?.nickname || '',
    avatarUrl: user?.avatarThumb || '',
    bio: user?.signature || '',
    followerCount: stats?.followerCount || 0,
    followingCount: stats?.followingCount || 0,
    videoCount: stats?.videoCount || 0,
    likeCount: stats?.heartCount || 0,
    verified: user?.verified || false,
    secUid: user?.secUid,
  };
}

export function extractSecUid(data: RapidAPIUserInfoResponse): string | undefined {
  return data.userInfo?.user?.secUid;
}
