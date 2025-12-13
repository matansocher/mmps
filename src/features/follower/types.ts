import type { Platform } from '@shared/follower';

export type ParsedChannelUrl = {
  readonly platform: Platform;
  readonly channelId: string;
  readonly isValid: boolean;
  readonly error?: string;
};

export type VideoNotification = {
  readonly videoUrl: string;
  readonly title: string;
  readonly description?: string;
  readonly summary?: string;
  readonly platform: Platform;
  readonly channelName: string;
  readonly publishedAt: string;
};
