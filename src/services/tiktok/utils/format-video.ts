import type { RapidAPIVideoItem, TikTokVideo } from '../types';

export function formatVideo(item: RapidAPIVideoItem, username?: string): TikTokVideo {
  const createTime = item.createTime ? new Date(item.createTime * 1000).toISOString() : new Date().toISOString();
  const authorUsername = item.author?.uniqueId || username || '';

  return {
    id: item.id,
    url: buildVideoUrl(authorUsername, item.id),
    description: item.desc || '',
    createdAt: createTime,
    stats: {
      views: item.stats?.playCount || item.playCount || 0,
      likes: item.stats?.diggCount || item.diggCount || 0,
      comments: item.stats?.commentCount || item.commentCount || 0,
      shares: item.stats?.shareCount || item.shareCount || 0,
    },
    duration: item.video?.duration || item.duration || 0,
    author: {
      id: item.author?.id || '',
      username: authorUsername,
      nickname: item.author?.nickname || '',
      avatarUrl: item.author?.avatarThumb,
    },
    music: item.music
      ? {
          id: item.music.id || '',
          title: item.music.title || '',
          author: item.music.authorName || '',
        }
      : undefined,
  };
}

export function buildVideoUrl(username: string, videoId: string): string {
  return `https://www.tiktok.com/@${username}/video/${videoId}`;
}
