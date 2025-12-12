import type { SupadataVideoResponse, YouTubeVideo } from '../types';

export function formatVideo(data: SupadataVideoResponse): YouTubeVideo {
  return {
    id: data.id || '',
    url: buildVideoUrl(data.id || ''),
    title: data.title || '',
    description: data.description ? truncateDescription(data.description, 200) : undefined,
    duration: data.duration || 0,
    durationFormatted: formatDuration(data.duration || 0),
    publishedAt: data.uploadDate || data.publishedAt || '',
    stats: {
      views: data.viewCount || 0,
      likes: data.likeCount || 0,
      comments: data.commentCount,
    },
    channel: data.channel
      ? {
          id: data.channel.id,
          name: data.channel.name,
          handle: data.channel.handle,
        }
      : undefined,
    transcriptLanguages: data.transcriptLanguages || [],
    thumbnailUrl: data.thumbnail,
  };
}

export function buildVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function truncateDescription(description: string, maxLength: number): string {
  if (description.length <= maxLength) {
    return description;
  }
  return description.substring(0, maxLength) + '...';
}
