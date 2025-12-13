import { PLATFORM_CONFIG, PLATFORMS } from '@shared/follower';
import type { ParsedChannelUrl } from '../types';

export function parseChannelUrl(url: string): ParsedChannelUrl {
  const trimmedUrl = url.trim();

  const tiktokConfig = PLATFORM_CONFIG[PLATFORMS.TIKTOK];
  const tiktokMatch = trimmedUrl.match(tiktokConfig.urlPattern);
  if (tiktokMatch) {
    return {
      platform: PLATFORMS.TIKTOK,
      channelId: tiktokMatch[1],
      isValid: true,
    };
  }

  const youtubeConfig = PLATFORM_CONFIG[PLATFORMS.YOUTUBE];
  const youtubeMatch = trimmedUrl.match(youtubeConfig.urlPattern);
  if (youtubeMatch) {
    const channelId = youtubeMatch[1] ? `@${youtubeMatch[1]}` : youtubeMatch[2];
    return {
      platform: PLATFORMS.YOUTUBE,
      channelId,
      isValid: true,
    };
  }

  return {
    platform: PLATFORMS.TIKTOK,
    channelId: '',
    isValid: false,
    error: 'Invalid URL format',
  };
}
