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

export function buildChannelUrl(channelIdOrHandle: string): string {
  if (channelIdOrHandle.startsWith('@')) {
    return `https://www.youtube.com/${channelIdOrHandle}`;
  }
  if (channelIdOrHandle.startsWith('UC')) {
    return `https://www.youtube.com/channel/${channelIdOrHandle}`;
  }
  return `https://www.youtube.com/@${channelIdOrHandle}`;
}
