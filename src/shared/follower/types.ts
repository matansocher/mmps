import type { ObjectId } from 'mongodb';
import { getNewVideosSince as getTikTokNewVideos, getTranscriptText as getTikTokTranscript, getUserInfo as getTikTokUserInfo } from '@services/tiktok';
import { getChannelInfo as getYouTubeChannelInfo, getNewVideosSince as getYouTubeNewVideos, getTranscriptText as getYouTubeTranscript } from '@services/youtube';

export const PLATFORMS = {
  TIKTOK: 'tiktok',
  YOUTUBE: 'youtube',
} as const;

export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS];

export type PlatformConfig = {
  readonly name: string;
  readonly emoji: string;
  readonly urlPattern: RegExp;
  readonly getChannelInfo: (channelId: string) => Promise<any>;
  readonly getChannelName: (channelInfo: any) => string;
  readonly getNewVideosSince: (channelId: string, lastVideoId: string, maxCount: number) => Promise<any[]>;
  readonly getTranscript: (videoUrl: string) => Promise<string>;
  readonly getVideoTitle: (video: any) => string;
  readonly getVideoDescription: (video: any) => string;
  readonly getVideoPublishedAt: (video: any) => string;
};

export const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  [PLATFORMS.TIKTOK]: {
    name: 'TikTok',
    emoji: '🎵',
    urlPattern: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9._]+)/,
    getChannelInfo: getTikTokUserInfo,
    getChannelName: (userInfo) => userInfo.nickname || userInfo.username,
    getNewVideosSince: getTikTokNewVideos,
    getTranscript: getTikTokTranscript,
    getVideoTitle: (video) => video.description || 'TikTok Video',
    getVideoDescription: (video) => video.description,
    getVideoPublishedAt: (video) => video.createdAt,
  },
  [PLATFORMS.YOUTUBE]: {
    name: 'YouTube',
    emoji: '▶️',
    urlPattern: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@([a-zA-Z0-9_-]+)|channel\/([a-zA-Z0-9_-]+))/,
    getChannelInfo: getYouTubeChannelInfo,
    getChannelName: (channelInfo) => channelInfo.name,
    getNewVideosSince: getYouTubeNewVideos,
    getTranscript: getYouTubeTranscript,
    getVideoTitle: (video) => video.title,
    getVideoDescription: (video) => video.description,
    getVideoPublishedAt: (video) => video.publishedAt,
  },
};

export type Subscription = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly platform: Platform;
  readonly channelId: string;
  readonly channelName: string;
  readonly channelUrl: string;
  readonly lastNotifiedVideoId: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type NotifiedVideo = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly videoId: string;
  readonly platform: Platform;
  readonly videoUrl: string;
  readonly notifiedAt: Date;
};

export type CreateSubscriptionData = {
  readonly chatId: number;
  readonly platform: Platform;
  readonly channelId: string;
  readonly channelName: string;
  readonly channelUrl: string;
};

export type UpdateSubscriptionData = {
  readonly lastNotifiedVideoId?: string;
  readonly updatedAt?: Date;
};

export type UserPreferences = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly isNotificationsEnabled: boolean;
  readonly createdAt: Date;
};
