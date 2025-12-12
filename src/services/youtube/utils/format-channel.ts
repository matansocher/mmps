import type { SupadataChannelResponse, YouTubeChannel } from '../types';

export function formatChannel(data: SupadataChannelResponse): YouTubeChannel {
  return {
    id: data.id || '',
    name: data.name || data.title || '',
    handle: data.handle,
    description: data.description,
    subscriberCount: data.subscriberCount || 0,
    videoCount: data.videoCount || 0,
    viewCount: data.viewCount,
    thumbnailUrl: data.thumbnail,
    customUrl: data.customUrl,
  };
}
